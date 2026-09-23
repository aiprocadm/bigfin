// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TransactionsLockingGuard } from '@/modules/TransactionsLocking/guards/TransactionsLockingGuard';
import { TransactionsLockingGroup } from '@/modules/TransactionsLocking/types/TransactionsLocking.types';
import { BankTransaction } from '../models/BankTransaction';

export const ACCRUAL_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Массовое проставление месяца начисления (FT-013 ТЗ-3) из реестра.
 *
 * Месяц пишется И в документ, И в его проводки: отчёты читают проводки, а
 * перепроводка пересобирает их из документа — и выбор человека обязан это
 * пережить. Денег и остатков это не меняет: меняется только месяц, в
 * котором операция видна в отчёте о прибыли.
 *
 * ЗАКРЫТЫЙ ПЕРИОД НЕ ТРОГАЕМ: перенос операции в закрытый месяц или из
 * него меняет прибыль того месяца, который бухгалтер уже закрыл.
 */
@Injectable()
export class SetAccrualPeriodService {
  constructor(
    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<typeof BankTransaction>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    private readonly transactionsLocking: TransactionsLockingGuard,
  ) {}

  public async setAccrualPeriod(
    ids: number[],
    accrualPeriod: string | null,
  ): Promise<{ updated: number }> {
    if (accrualPeriod !== null && !ACCRUAL_PERIOD_PATTERN.test(accrualPeriod)) {
      throw new ServiceError('ACCRUAL_PERIOD_INVALID', 'Месяц начисления — в виде ГГГГ-ММ');
    }
    const uniqueIds = [...new Set(ids.map(Number))].filter((id) => id > 0);
    if (uniqueIds.length === 0) return { updated: 0 };

    const transactions: any[] = await this.bankTransactionModel()
      .query()
      .whereIn('id', uniqueIds);

    for (const transaction of transactions) {
      // Под замком — и дата платежа, и старый, и новый месяц начисления.
      const dates = [
        transaction.date,
        transaction.accrualPeriod ? `${transaction.accrualPeriod}-01` : null,
        accrualPeriod ? moment(`${accrualPeriod}-01`).endOf('month') : null,
      ].filter(Boolean);
      for (const date of dates) {
        await this.transactionsLocking.validateTransactionsLocking(
          date,
          TransactionsLockingGroup.Financial,
        );
      }
    }

    const found = transactions.map((transaction) => transaction.id);
    if (found.length === 0) return { updated: 0 };

    await this.bankTransactionModel()
      .query()
      .whereIn('id', found)
      .patch({ accrualPeriod } as any);
    await this.accountTransactionModel()
      .query()
      .where('referenceType', 'CashflowTransaction')
      .whereIn('referenceId', found)
      .patch({ accrualPeriod } as any);

    return { updated: found.length };
  }
}
