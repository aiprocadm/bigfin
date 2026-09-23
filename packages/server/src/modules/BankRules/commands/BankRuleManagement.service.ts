// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { ServiceError } from '@/modules/Items/ServiceError';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { BankRule } from '../models/BankRule';
import { findRuleConflicts } from '../utils/ruleConflicts';

/** Сколько последних строк выписки смотрит проверка конфликта. */
export const CONFLICT_SAMPLE_ROWS = 2000;

export const BANK_RULE_MANAGEMENT_ERRORS = {
  ORDER_UNKNOWN_RULES: 'BANK_RULE_ORDER_UNKNOWN_RULES',
};

/**
 * Порядок, пауза, копия и конфликт автоправил (FT-035 ТЗ-3).
 */
@Injectable()
export class BankRuleManagementService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(BankRule.name)
    private readonly bankRuleModel: TenantModelProxy<typeof BankRule>,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<typeof UncategorizedBankTransaction>,
  ) {}

  /**
   * Новый порядок — список правил сверху вниз. Приходит ВЕСЬ список:
   * частичный порядок оставил бы у остальных старые номера, и два правила
   * с одним номером спорили бы вслепую.
   */
  public async reorder(ids: number[]) {
    const rules: any[] = await this.bankRuleModel().query().select('id');
    const known = new Set(rules.map((rule) => Number(rule.id)));
    const unique = [...new Set(ids.map(Number))];
    if (unique.length !== known.size || unique.some((id) => !known.has(id))) {
      throw new ServiceError(
        BANK_RULE_MANAGEMENT_ERRORS.ORDER_UNKNOWN_RULES,
        'Порядок должен перечислять все правила ровно по одному разу',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.uow.withTransaction(async (trx) => {
      for (const [index, id] of unique.entries()) {
        await this.bankRuleModel().query(trx).findById(id).patch({ order: index } as any);
      }
    });
    return { ordered: unique.length };
  }

  /** Пауза: правило остаётся, но не срабатывает (FT-035). */
  public async setPaused(ruleId: number, paused: boolean) {
    await this.bankRuleModel().query().findById(ruleId).throwIfNotFound();
    await this.bankRuleModel()
      .query()
      .findById(ruleId)
      .patch({ pausedAt: paused ? moment().format('YYYY-MM-DD HH:mm:ss') : null } as any);
    return { id: ruleId, paused };
  }

  /**
   * Копия правила « (копия)» в конце списка — со всеми условиями и строками
   * разбиения. Копия сразу на паузе: две одинаковые активные копии тут же
   * заспорили бы за одни строки.
   */
  public async clone(ruleId: number) {
    const rule: any = await this.bankRuleModel()
      .query()
      .findById(ruleId)
      .withGraphFetched('conditions')
      .withGraphFetched('splits')
      .throwIfNotFound();
    const last: any = await this.bankRuleModel().query().max('order as maxOrder').first();
    const { id, createdAt, updatedAt, conditions, splits, ...rest } = rule;

    return this.bankRuleModel()
      .query()
      .insertGraphAndFetch({
        ...rest,
        name: `${rule.name} (копия)`,
        order: Number(last?.maxOrder ?? 0) + 1,
        pausedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
        conditions: (conditions ?? []).map(({ field, comparator, value }) => ({
          field,
          comparator,
          value,
        })),
        splits: (splits ?? []).map(({ sharePercent, articleId, projectId, contactId, sortOrder }) => ({
          sharePercent,
          articleId,
          projectId,
          contactId,
          sortOrder,
        })),
      } as any);
  }

  /**
   * С какими правилами спорит новое или правленое — по последним строкам
   * выписки (FT-035). Ответ до сохранения: человек решает, а не узнаёт.
   */
  public async conflicts(candidate: any) {
    const rules: any[] = await this.bankRuleModel()
      .query()
      .withGraphFetched('conditions')
      .orderBy('order', 'asc');
    const rows: any[] = await this.uncategorizedModel()
      .query()
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(CONFLICT_SAMPLE_ROWS)
      .select('id', 'date', 'amount', 'description', 'payee', 'accountId');
    const conflicts = findRuleConflicts(candidate, rules, rows);
    return {
      checkedRows: rows.length,
      conflicts: conflicts.map((c) => ({
        ...c,
        samples: c.samples.map((row: any) => ({
          id: row.id,
          date: row.date,
          amount: row.amount,
          description: row.description,
          payee: row.payee,
        })),
      })),
    };
  }
}
