import { Knex } from 'knex';
import { Inject, Injectable } from '@nestjs/common';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { BankTransaction } from '../models/BankTransaction';
import { BankTransactionGL } from './BankTransactionGL';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TransactionSplitsService } from '@/modules/TransactionSplits/TransactionSplits.service';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { Account } from '@/modules/Accounts/models/Account.model';
import { BankTransactionGLSplit } from './BankTransactionGL';

import { CASHFLOW_SPLIT_REFERENCE } from '@/modules/TransactionSplits/constants';

export { CASHFLOW_SPLIT_REFERENCE };

@Injectable()
export class BankTransactionGLEntriesService {
  constructor(
    private readonly ledgerStorage: LedgerStorageService,

    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<typeof BankTransaction>,

    private readonly transactionSplits: TransactionSplitsService,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<typeof ManagementArticleAccount>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Части операции со счетами их статей. Счёт статьи — первый по номеру
   * среди привязанных: у статьи их бывает несколько, а выбор обязан быть
   * одинаковым при каждой перепроводке.
   */
  private async splitsOf(transactionId: number): Promise<BankTransactionGLSplit[]> {
    const rows: any[] = await this.transactionSplits.getSplits(
      CASHFLOW_SPLIT_REFERENCE,
      transactionId,
    );
    if (rows.length === 0) return [];
    const articleIds = [...new Set(rows.map((row) => Number(row.articleId)))];
    const links: any[] = await this.articleAccountModel()
      .query()
      .whereIn('articleId', articleIds)
      .orderBy('accountId', 'asc');
    const accountOf = new Map<number, number>();
    links.forEach((link) => {
      if (!accountOf.has(link.articleId)) accountOf.set(link.articleId, link.accountId);
    });
    const accounts: any[] = await this.accountModel()
      .query()
      .whereIn('id', [...new Set(accountOf.values())]);
    const normalOf = new Map(accounts.map((a) => [a.id, a.accountNormal]));
    return rows
      .filter((row) => accountOf.has(Number(row.articleId)))
      .map((row) => {
        const accountId = accountOf.get(Number(row.articleId))!;
        return {
          accountId,
          accountNormal: normalOf.get(accountId),
          projectId: row.projectId ?? null,
          amount: Number(row.amount),
        };
      });
  }

  /**
   * Write the journal entries of the given cashflow transaction.
   * @param {ICashflowTransaction} cashflowTransaction
   * @return {Promise<void>}
   */
  public writeJournalEntries = async (
    cashflowTransactionId: number,
    trx?: Knex.Transaction,
  ): Promise<void> => {
    // Retrieves the cashflow transactions with associated entries.
    const transaction = await this.bankTransactionModel()
      .query(trx)
      .findById(cashflowTransactionId)
      .withGraphFetched('cashflowAccount')
      .withGraphFetched('creditAccount');

    // Retrieves the cashflow transaction ledger.
    const splits = await this.splitsOf(cashflowTransactionId);
    const ledger = new BankTransactionGL(transaction, splits).getCashflowLedger();

    await this.ledgerStorage.commit(ledger, trx);
  };

  /**
   * Delete the journal entries.
   * @param {number} cashflowTransactionId - Cashflow transaction id.
   * @return {Promise<void>}
   */
  public revertJournalEntries = async (
    cashflowTransactionId: number,
    trx?: Knex.Transaction,
  ): Promise<void> => {
    await this.ledgerStorage.deleteByReference(
      cashflowTransactionId,
      'CashflowTransaction',
      trx,
    );
  };
}
