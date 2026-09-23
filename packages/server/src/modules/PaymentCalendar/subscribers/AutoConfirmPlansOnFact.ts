// © 2026 Bigfin
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as moment from 'moment';
import { Knex } from 'knex';
import { events } from '@/common/events/events';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { pascalType } from '@/modules/BankingTransactions/utils/transactionActions';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { FORECAST_STATUSES } from '../constants';
import { MATCH_DATE_TOLERANCE_DAYS, pickPlanForFact } from '../utils/planMatching';
import { nextOccurrenceAfter, RecurrenceRule } from '../utils/expandRecurrence';

const INCOMING = ['OtherIncome', 'OwnerContribution'];
const OUTGOING = ['OtherExpense', 'OwnerDrawing'];

/**
 * Автоподтверждение плана фактом (FT-052 ТЗ-3). Появилась денежная операция
 * — создана вручную или разнесена из выписки — ищем план с галочкой
 * «подтверждать автоматически», которому она соответствует. Разовый план
 * становится исполненным со ссылкой на факт, повторяющийся уходит на
 * следующее вхождение: иначе прогноз посчитал бы деньги дважды.
 *
 * Сбой сопоставления не отменяет операцию: она важнее отметки в плане.
 */
@Injectable()
export class AutoConfirmPlansOnFactSubscriber {
  private readonly logger = new Logger(AutoConfirmPlansOnFactSubscriber.name);

  constructor(
    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  @OnEvent(events.cashflow.onTransactionCreated)
  async onCreated({ cashflowTransaction, trx }: { cashflowTransaction: any; trx?: Knex.Transaction }) {
    await this.confirm(cashflowTransaction, trx);
  }

  @OnEvent(events.cashflow.onTransactionCategorized)
  async onCategorized({ cashflowTransaction, trx }: { cashflowTransaction: any; trx?: Knex.Transaction }) {
    await this.confirm(cashflowTransaction, trx);
  }

  public async confirm(transaction: any, trx?: Knex.Transaction) {
    try {
      if (!transaction?.id) return;
      const type = pascalType(transaction.transactionType);
      const direction = INCOMING.includes(type) ? 'inflow' : OUTGOING.includes(type) ? 'outflow' : null;
      // Переводы между своими счетами планом не закрываются.
      if (!direction) return;
      const date = moment(transaction.date).format('YYYY-MM-DD');
      const plans: any[] = await this.operationModel()
        .query(trx)
        .where('autoConfirm', true)
        .whereIn('status', FORECAST_STATUSES as unknown as string[])
        .where('direction', direction)
        .where('accountId', transaction.cashflowAccountId)
        // Разовый — в пределах допуска по дате; повторы проверяются по вхождениям.
        .where((q) =>
          q
            .whereNotNull('recurrence')
            .orWhereBetween('plannedDate', [
              moment(date).subtract(MATCH_DATE_TOLERANCE_DAYS, 'days').format('YYYY-MM-DD'),
              moment(date).add(MATCH_DATE_TOLERANCE_DAYS, 'days').format('YYYY-MM-DD'),
            ]),
        );
      const picked = pickPlanForFact(
        plans.map((plan) => ({ ...plan, plannedDate: moment(plan.plannedDate).format('YYYY-MM-DD') })),
        {
          direction,
          amount: Number(transaction.amount),
          date,
          accountId: Number(transaction.cashflowAccountId),
          contactId: transaction.contactId ? Number(transaction.contactId) : null,
        },
      );
      if (!picked) return;
      const { plan, occurrence } = picked;
      const next = plan.recurrence
        ? nextOccurrenceAfter(plan.recurrence as RecurrenceRule, plan.plannedDate, occurrence)
        : null;
      await this.operationModel()
        .query(trx)
        .findById(plan.id)
        .patch({
          matchedTransactionId: Number(transaction.id),
          ...(next ? { plannedDate: next } : { status: 'done' }),
        } as any);
    } catch (error) {
      this.logger.error(`Автоподтверждение плана не выполнено: ${(error as Error)?.message}`);
    }
  }
}
