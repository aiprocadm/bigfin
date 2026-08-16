import { Inject, Injectable } from '@nestjs/common';
import { MomentInput } from 'moment';
import { TransactionsLockingGroup } from '../types/TransactionsLocking.types';
import { TransactionsLockingGuard } from './TransactionsLockingGuard';

@Injectable()
export class FinancialTransactionLocking {
  constructor(
    public readonly transactionLockingGuardService: TransactionsLockingGuard,
  ) {}

  /**
   * Validates the transaction locking of cashflow command action.
   * @param {MomentInput} transactionDate - The transaction date (Date или строка).
   * @throws {ServiceError(TRANSACTIONS_DATE_LOCKED)}
   */
  public transactionLockingGuard = async (transactionDate: MomentInput) => {
    await this.transactionLockingGuardService.transactionsLockingGuard(
      transactionDate,
      TransactionsLockingGroup.Financial,
    );
  };
}
