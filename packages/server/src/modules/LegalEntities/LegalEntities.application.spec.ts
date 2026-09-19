// © 2026 Bigfin
import {
  LEGAL_ENTITY_ERRORS,
  LegalEntitiesApplication,
} from './LegalEntities.application';

/**
 * Этап 6 ТЗ, §6.4. Справочник юрлиц.
 *
 * Правила здесь — про целостность разреза, а не про формальности: юрлицо с
 * операциями нельзя удалить, головное в группе одно, а список никогда не
 * бывает пустым.
 */
const buildApp = (options: {
  entities?: any[];
  total?: number;
  usedTables?: string[];
  accountsRows?: any[];
  onPatchOthers?: (patch: any) => void;
} = {}) => {
  const entities = options.entities ?? [];
  const deleted: number[] = [];
  const patchedOthers: any[] = [];

  const legalEntityModel = () => ({
    query: () => {
      const chain: any = {
        orderBy: () => chain,
        findById: async (id: number) =>
          entities.find((entity) => entity.id === id) ?? null,
        resultSize: async () => options.total ?? entities.length,
        deleteById: async (id: number) => {
          deleted.push(id);
          return 1;
        },
        insertAndFetch: async (draft: any) => ({ id: 10, ...draft }),
        patchAndFetchById: async (id: number, patch: any) =>
          entities.find((entity) => entity.id === id)
            ? { id, ...patch }
            : null,
        whereNot: () => chain,
        patch: async (patch: any) => {
          patchedOthers.push(patch);
          options.onPatchOthers?.(patch);
          return 1;
        },
        then: (resolve: any) => resolve(entities),
      };
      return chain;
    },
  });

  const knex: any = (table: string) => {
    const chain: any = {
      select: () => chain,
      count: () => chain,
      whereNotNull: () => chain,
      where: () => chain,
      groupBy: async () => options.accountsRows ?? [],
      first: async () =>
        (options.usedTables ?? []).includes(table) ? { id: 1 } : null,
    };
    return chain;
  };
  // Существование таблицы спрашивают запросом к `information_schema`, а не
  // через `schema.hasTable`: тот сравнивает имя с учётом регистра и отвечает
  // «нет» про существующую таблицу. Подделка повторяет настоящий способ.
  knex.raw = async () => [[{ count: 1 }]];

  const ensureDefault = { ensure: async () => ({ id: 1 }) };

  const app = new LegalEntitiesApplication(
    legalEntityModel as any,
    (() => knex) as any,
    ensureDefault as any,
  );

  return { app, deleted, patchedOthers };
};

/**
 * ВАЖНО ПРО ИМЕНА В ПОДДЕЛКЕ. Строки здесь отдаются в ВЕРБЛЮЖЬЕМ виде —
 * ровно так, как их возвращает настоящий knex: отображение
 * `knexSnakeCaseMappers` переводит `LEGAL_ENTITY_ID` в `legalEntityId`.
 *
 * Сначала подделка отдавала змеиные имена, и тесты были зелёными, пока
 * отчёт на живой базе показывал бессмыслицу: ключ группировки получался
 * «undefined:undefined». Подделка, говорящая не на языке базы, не стережёт
 * ничего — она лишь повторяет ошибку кода.
 */
describe('LegalEntitiesApplication — список', () => {
  it('перед выдачей списка создаётся юрлицо по умолчанию', async () => {
    // Пустой справочник заставил бы человека заводить юрлицо руками,
    // чтобы увидеть то, что у него и так одно.
    let ensured = false;
    const { app } = buildApp({ entities: [] });
    (app as any).ensureDefault = {
      ensure: async () => {
        ensured = true;
        return { id: 1 };
      },
    };

    await app.getLegalEntities();

    expect(ensured).toBe(true);
  });

  it('счётчик счетов приходит из базы, а не считается на глаз', async () => {
    const { app } = buildApp({
      entities: [
        { id: 1, name: 'Ромашка', form: 'ООО', isPrimary: true, active: true },
        { id: 2, name: 'Лютик', form: 'ИП', isPrimary: false, active: true },
      ],
      accountsRows: [{ legalEntityId: 1, total: 7 }],
    });

    const rows = await app.getLegalEntities();

    expect(rows[0].accountsCount).toBe(7);
    // У юрлица без счетов — ноль, а не пусто.
    expect(rows[1].accountsCount).toBe(0);
  });
});

describe('LegalEntitiesApplication — удаление', () => {
  const two = [
    { id: 1, name: 'Ромашка' },
    { id: 2, name: 'Лютик' },
  ];

  it('юрлицо с операциями удалить нельзя', async () => {
    // Иначе операции остались бы без владельца, а разрез по юрлицу —
    // с дырой, которую никто не заметит.
    const { app, deleted } = buildApp({
      entities: two,
      usedTables: ['accounts_transactions'],
    });

    await expect(app.deleteLegalEntity(2)).rejects.toThrow();
    expect(deleted).toEqual([]);
  });

  it('последнее юрлицо удалить нельзя', async () => {
    const { app, deleted } = buildApp({
      entities: [{ id: 1, name: 'Ромашка' }],
      total: 1,
    });

    await expect(app.deleteLegalEntity(1)).rejects.toThrow();
    expect(deleted).toEqual([]);
  });

  it('ошибка называет причину, а не «нельзя»', async () => {
    const { app } = buildApp({
      entities: two,
      usedTables: ['bills'],
    });

    try {
      await app.deleteLegalEntity(2);
      throw new Error('удаление не должно было пройти');
    } catch (error: any) {
      expect(error.errorType ?? error.message).toBe(
        LEGAL_ENTITY_ERRORS.LEGAL_ENTITY_IN_USE,
      );
    }
  });

  it('свободное юрлицо удаляется', async () => {
    const { app, deleted } = buildApp({ entities: two });

    await app.deleteLegalEntity(2);

    expect(deleted).toEqual([2]);
  });

  it('несуществующее юрлицо — понятная ошибка', async () => {
    const { app } = buildApp({ entities: two });

    await expect(app.deleteLegalEntity(99)).rejects.toThrow();
  });
});

describe('LegalEntitiesApplication — головное юрлицо', () => {
  it('назначение головного снимает признак с остальных', async () => {
    // Два головных юрлица — это спор о том, чьи реквизиты в печатной форме.
    const { app, patchedOthers } = buildApp({
      entities: [{ id: 2, name: 'Лютик' }],
    });

    await app.editLegalEntity(2, { isPrimary: true } as any);

    expect(patchedOthers).toEqual([{ isPrimary: false }]);
  });

  it('обычная правка чужой признак не трогает', async () => {
    // Иначе переименование юрлица снимало бы головное у другого —
    // тихо и без единой ошибки.
    const { app, patchedOthers } = buildApp({
      entities: [{ id: 2, name: 'Лютик' }],
    });

    await app.editLegalEntity(2, { name: 'Лютик и Ко' } as any);

    expect(patchedOthers).toEqual([]);
  });

  it('снятие признака у себя не назначает головным никого', async () => {
    const { app, patchedOthers } = buildApp({
      entities: [{ id: 2, name: 'Лютик' }],
    });

    await app.editLegalEntity(2, { isPrimary: false } as any);

    expect(patchedOthers).toEqual([]);
  });
});
