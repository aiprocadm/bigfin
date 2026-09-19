// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';

import { EnsureDefaultLegalEntityService } from './EnsureDefaultLegalEntity.service';
import {
  BackfillTableResult,
  backfillLegalEntityIdInTables,
} from '../utils/backfillLegalEntityId';

export { BackfillTableResult };

export interface BackfillResult {
  legalEntityId: number;
  tables: BackfillTableResult[];
  updated: number;
}

/**
 * Заполнение `legal_entity_id` у существующих строк (этап 6 ТЗ, §6.3 шаг 3).
 *
 * Сами правила заполнения живут в `utils/backfillLegalEntityId` — их же
 * зовёт команда `tenants:legal-entity:backfill` из терминала. Одно правило,
 * один исполнитель: иначе очередь внутри продукта и выкатка разошлись бы,
 * и заметить это было бы нечем.
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

    const tables = await backfillLegalEntityIdInTables(
      this.tenantKnex(),
      legalEntityId,
    );

    return {
      legalEntityId,
      tables,
      updated: tables.reduce((sum, row) => sum + row.updated, 0),
    };
  }
}
