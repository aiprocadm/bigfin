// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import { LegalEntity } from '../models/LegalEntity.model';

export interface IntercompanyRow {
  referenceType: string;
  referenceId: number;
  date: string;
  /** Юрлицо, от которого ушли деньги. */
  fromLegalEntityId: number | null;
  fromLegalEntityName: string | null;
  /** Юрлицо, к которому пришли. */
  toLegalEntityId: number | null;
  toLegalEntityName: string | null;
  amount: number;
}

export interface IntercompanyTurnoverResult {
  fromDate: string;
  toDate: string;
  rows: IntercompanyRow[];
  total: number;
}

/** Сколько операций показываем: список для сверки, а не выгрузка всего. */
export const INTERCOMPANY_LIMIT = 500;

/**
 * Отчёт «Внутригрупповые обороты» (этап 7 ТЗ, §7.2 п. 5).
 *
 * Нужен для сверки: кто кому и сколько перевёл внутри группы. Именно он
 * делает исключение таких оборотов проверяемым — без него человек видит,
 * что сводная выручка меньше суммы выручек юрлиц, и не может убедиться,
 * что разница именно та.
 */
@Injectable()
export class GetIntercompanyTurnoverService {
  constructor(
    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,

    @Inject(LegalEntity.name)
    private readonly legalEntityModel: TenantModelProxy<typeof LegalEntity>,
  ) {}

  public async getTurnover(
    fromDate: string,
    toDate: string,
  ): Promise<IntercompanyTurnoverResult> {
    const knex = this.tenantKnex();

    const hasColumn = await knex.schema.hasColumn(
      'accounts_transactions',
      'is_intercompany',
    );
    if (!hasColumn) {
      return { fromDate, toDate, rows: [], total: 0 };
    }

    const legs: any[] = await knex('accounts_transactions')
      .select(
        'reference_type',
        'reference_id',
        'date',
        'legal_entity_id',
        'debit',
        'credit',
      )
      .where('is_intercompany', true)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .orderBy('date', 'desc')
      .limit(INTERCOMPANY_LIMIT * 4);

    const names = await this.getLegalEntityNames();
    const rows = this.foldLegsIntoRows(legs, names);

    return {
      fromDate,
      toDate,
      rows: rows.slice(0, INTERCOMPANY_LIMIT),
      total: rows.reduce((sum, row) => sum + row.amount, 0),
    };
  }

  /**
   * Собирает ноги в строки «кто кому».
   *
   * Деньги ушли у того юрлица, чья нога кредитовая по денежному счёту, и
   * пришли тому, чья дебетовая. Берём максимальную сумму пары: обе ноги
   * одной операции равны, и складывать их значило бы удвоить перевод.
   */
  private foldLegsIntoRows(
    legs: any[],
    names: Map<number, string>,
  ): IntercompanyRow[] {
    const byReference = new Map<string, any[]>();

    legs.forEach((leg) => {
      const key = `${leg.reference_type}:${leg.reference_id}`;
      const list = byReference.get(key) ?? [];
      list.push(leg);
      byReference.set(key, list);
    });

    const rows: IntercompanyRow[] = [];

    byReference.forEach((group, key) => {
      const [referenceType, referenceId] = key.split(':');

      const from = group.find((leg) => Number(leg.credit ?? 0) > 0);
      const to = group.find((leg) => Number(leg.debit ?? 0) > 0);

      const amount = Math.max(
        ...group.map((leg) =>
          Math.max(Number(leg.debit ?? 0), Number(leg.credit ?? 0)),
        ),
      );

      const entityId = (leg: any) =>
        leg?.legal_entity_id != null ? Number(leg.legal_entity_id) : null;

      rows.push({
        referenceType,
        referenceId: Number(referenceId),
        date: group[0]?.date,
        fromLegalEntityId: entityId(from),
        fromLegalEntityName: entityId(from)
          ? names.get(entityId(from) as number) ?? null
          : null,
        toLegalEntityId: entityId(to),
        toLegalEntityName: entityId(to)
          ? names.get(entityId(to) as number) ?? null
          : null,
        amount,
      });
    });

    return rows;
  }

  private async getLegalEntityNames(): Promise<Map<number, string>> {
    const entities: any[] = await this.legalEntityModel().query();
    const names = new Map<number, string>();
    entities.forEach((entity) => names.set(Number(entity.id), entity.name));
    return names;
  }
}
