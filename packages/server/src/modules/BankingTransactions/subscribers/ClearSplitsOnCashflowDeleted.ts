// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { events } from '@/common/events/events';
import { runAfterTransaction } from '@/modules/Tenancy/TenancyDB/TransactionsHooks';
import { TransactionSplitsService } from '@/modules/TransactionSplits/TransactionSplits.service';
import { CASHFLOW_SPLIT_REFERENCE } from '@/modules/TransactionSplits/constants';
import { ICommandCashflowDeletedPayload } from '../types/BankingTransactions.types';

/**
 * Удалили денежную операцию (или отменили её разноску) — удаляем и её части
 * от автоправила «Разбить» (FT-031 ТЗ-3). Иначе они оставались бы в
 * `transaction_splits` сиротами без операции.
 *
 * После фиксации: если удаление откатится, части должны остаться.
 */
@Injectable()
export class ClearSplitsOnCashflowDeletedSubscriber {
  constructor(private readonly transactionSplits: TransactionSplitsService) {}

  @OnEvent(events.cashflow.onTransactionDeleted)
  public handle({ cashflowTransactionId, trx }: ICommandCashflowDeletedPayload) {
    runAfterTransaction(trx, async () => {
      try {
        await this.transactionSplits.clearSplits(
          CASHFLOW_SPLIT_REFERENCE,
          Number(cashflowTransactionId),
        );
      } catch (error) {
        console.error('[splits] не удалось убрать части удалённой операции', error);
      }
    });
  }
}
