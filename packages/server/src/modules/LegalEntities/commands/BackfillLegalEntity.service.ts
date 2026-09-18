// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';

import {
  BACKFILL_BATCH_SIZE,
  BACKFILL_MAX_BATCHES,
  LEGAL_ENTITY_TABLES,
} from '../constants';
import { EnsureDefaultLegalEntityService } from './EnsureDefaultLegalEntity.service';

export interface BackfillTableResult {
  table: string;
  updated: number;
  /** Дошли до потолка пакетов — остаток заберёт следующий запуск. */
  incomplete: boolean;
}

export interface BackfillResult {
  legalEntityId: number;
  tables: BackfillTableResult[];
  updated: number;
}

/**
 * Заполнение `legal_entity_id` у существующих строк (этап 6 ТЗ, §6.3 шаг 3).
 *
 * Два правила, которые важнее скорости:
 *
 * 1. **Трогаем только пустые.** Условие `legal_entity_id IS NULL` — не
 *    оптимизация, а защита: строке могли уже назначить юрлицо руками, и
 *    заполнение не должно переписать этот выбор на «по умолчанию».
 *
 * 2. **Пакетами.** У живой организации в проводках сотни тысяч строк. Один
 *    UPDATE на всю таблицу держит блокировку так долго, что продукт встаёт.
 *
 * Из первого правила бесплатно следует возобновляемость: задачу можно
 * прервать и запустить заново — она продолжит с того места, где остановилась,
 * потому что заполненные строки в выборку больше не попадают.
 */
@Injectable()
export class BackfillLegalEntityService {
  constructor(
    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,

    private readonly ensureDefault: EnsureDefaultLegalEntityService,
  ) {}

  /**
   * Проставляет всем незаполненным строкам юрлицо по умолчанию.
   */
  public async backfill(): Promise<BackfillResult> {
    const legalEntity = await this.ensureDefault.ensure();
    const legalEntityId = Number((legalEntity as any).id);

    const tables: BackfillTableResult[] = [];

    for (const table of LEGAL_ENTITY_TABLES) {
      tables.push(await this.backfillTable(table, legalEntityId));
    }

    return {
      legalEntityId,
      tables,
      updated: tables.reduce((sum, row) => sum + row.updated, 0),
    };
  }

  /**
   * Одна таблица, пакет за пакетом, пока пустые строки не кончатся.
   *
   * Отбор идёт по первичным ключам, а не `UPDATE ... LIMIT`: так пакет
   * читается и пишется явно, и это работает одинаково на любой базе.
   */
  private async backfillTable(
    table: string,
    legalEntityId: number,
  ): Promise<BackfillTableResult> {
    const knex = this.tenantKnex();

    // Таблицы могло не быть: организации заводились в разное время, и модуль,
    // которого у них нет, таблицу не создавал.
    const exists = await knex.schema.hasTable(table);
    if (!exists) return { table, updated: 0, incomplete: false };

    let updated = 0;

    for (let batch = 0; batch < BACKFILL_MAX_BATCHES; batch += 1) {
      const rows: any[] = await knex(table)
        .select('id')
        .whereNull('legal_entity_id')
        .limit(BACKFILL_BATCH_SIZE);

      if (rows.length === 0) {
        return { table, updated, incomplete: false };
      }

      await knex(table)
        .whereIn(
          'id',
          rows.map((row) => row.id),
        )
        // Условие повторяется и здесь: между чтением пакета и записью строке
        // могли назначить юрлицо руками, и перезаписывать его нельзя.
        .whereNull('legal_entity_id')
        .update({ legal_entity_id: legalEntityId });

      updated += rows.length;
    }

    return { table, updated, incomplete: true };
  }
}
