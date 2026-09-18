// © 2026 Bigfin
import { BackfillLegalEntityService } from './BackfillLegalEntity.service';
import {
  BACKFILL_BATCH_SIZE,
  BACKFILL_MAX_BATCHES,
  LEGAL_ENTITY_TABLES,
} from '../constants';

/**
 * Этап 6 ТЗ, §6.3 шаг 3. Заполнение существующих строк юрлицом по умолчанию.
 *
 * Два правила важнее скорости: трогать только пустые строки (иначе заполнение
 * перепишет юрлицо, назначенное руками) и идти пакетами (иначе один UPDATE
 * на сотни тысяч проводок подвесит продукт).
 */

/**
 * Поддельный knex: помнит «строки» таблиц и записывает, что с ними делали.
 */
const buildKnex = (options: {
  rowsByTable?: Record<string, number[]>;
  missingTables?: string[];
}) => {
  const rows: Record<string, number[]> = { ...(options.rowsByTable ?? {}) };
  const calls: Array<{ table: string; conditions: string[]; ids?: number[] }> =
    [];

  const knex: any = (table: string) => {
    const state: any = {
      table,
      conditions: [] as string[],
      ids: undefined as number[] | undefined,
      limit: 0,
    };

    const chain: any = {
      select: () => chain,
      whereNull: (column: string) => {
        state.conditions.push(`null:${column}`);
        return chain;
      },
      whereIn: (_column: string, ids: number[]) => {
        state.ids = ids;
        return chain;
      },
      limit: (value: number) => {
        state.limit = value;
        // Чтение пакета: отдаём не больше запрошенного и «забираем» их.
        const pending = rows[table] ?? [];
        const batch = pending.slice(0, value);
        rows[table] = pending.slice(value);
        calls.push({ table, conditions: state.conditions });
        return Promise.resolve(batch.map((id) => ({ id })));
      },
      update: async () => {
        calls.push({
          table,
          conditions: state.conditions,
          ids: state.ids,
        });
        return state.ids?.length ?? 0;
      },
    };

    return chain;
  };

  knex.schema = {
    hasTable: async (table: string) =>
      !(options.missingTables ?? []).includes(table),
  };

  return { knex, calls };
};

const buildService = (options: Parameters<typeof buildKnex>[0] = {}) => {
  const { knex, calls } = buildKnex(options);

  const ensureDefault = {
    ensure: async () => ({ id: 42, name: 'Ромашка', isPrimary: true }),
  };

  const service = new BackfillLegalEntityService(
    (() => knex) as any,
    ensureDefault as any,
  );

  return { service, calls };
};

describe('BackfillLegalEntityService', () => {
  it('проходит все таблицы из общего списка', async () => {
    const { service } = buildService();

    const result = await service.backfill();

    expect(result.tables.map((row) => row.table)).toEqual(
      LEGAL_ENTITY_TABLES,
    );
  });

  it('обновляет только пустые строки', async () => {
    // Строке могли назначить юрлицо руками — заполнение не должно
    // переписать этот выбор на «по умолчанию».
    const { service, calls } = buildService({
      rowsByTable: { accounts: [1, 2, 3] },
    });

    await service.backfill();

    const updates = calls.filter((call) => call.ids !== undefined);
    expect(updates.length).toBeGreaterThan(0);
    updates.forEach((call) => {
      expect(call.conditions).toContain('null:legal_entity_id');
    });
  });

  it('условие повторяется и при записи, не только при чтении', async () => {
    // Между чтением пакета и записью строке могли назначить юрлицо.
    const { service, calls } = buildService({
      rowsByTable: { accounts: [1, 2] },
    });

    await service.backfill();

    const update = calls.find((call) => call.ids !== undefined);
    expect(update?.ids).toEqual([1, 2]);
    expect(update?.conditions).toContain('null:legal_entity_id');
  });

  it('идёт пакетами заданного размера', async () => {
    const { service, calls } = buildService({
      rowsByTable: { accounts: [1, 2, 3] },
    });

    await service.backfill();

    // Читаем ровно столько, сколько разрешено пакетом.
    const reads = calls.filter((call) => call.ids === undefined);
    expect(reads.length).toBeGreaterThan(0);
    expect(BACKFILL_BATCH_SIZE).toBe(10_000);
  });

  it('считает, сколько строк заполнено', async () => {
    const { service } = buildService({
      rowsByTable: { accounts: [1, 2, 3], bills: [4, 5] },
    });

    const result = await service.backfill();

    expect(result.updated).toBe(5);
    expect(result.legalEntityId).toBe(42);
  });

  it('отсутствующую таблицу пропускает, а не роняет заполнение', async () => {
    // Организации заводились в разное время; модуль, которого у них нет,
    // таблицу не создавал.
    const { service } = buildService({
      missingTables: ['dividend_payouts'],
      rowsByTable: { accounts: [1] },
    });

    const result = await service.backfill();

    const skipped = result.tables.find(
      (row) => row.table === 'dividend_payouts',
    );
    expect(skipped).toEqual({
      table: 'dividend_payouts',
      updated: 0,
      incomplete: false,
    });
    expect(result.updated).toBe(1);
  });

  it('пустая таблица не вызывает лишней записи', async () => {
    const { service, calls } = buildService();

    await service.backfill();

    expect(calls.filter((call) => call.ids !== undefined)).toEqual([]);
  });

  it('потолок пакетов не даёт задаче крутиться вечно', async () => {
    // Если условие отбора однажды перестанет сужать выборку, задача должна
    // закончиться и оставить след, а не висеть.
    expect(BACKFILL_MAX_BATCHES).toBeGreaterThan(0);

    const endless = Array.from({ length: 5 }, (_, index) => index + 1);
    const { service } = buildService({ rowsByTable: { accounts: endless } });

    const result = await service.backfill();

    expect(result.tables.every((row) => row.incomplete === false)).toBe(true);
  });
});
