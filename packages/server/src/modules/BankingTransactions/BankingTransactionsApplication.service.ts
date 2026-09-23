import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TransactionActionsService } from './commands/TransactionActions.service';
import { DeleteCashflowTransaction } from './commands/DeleteCashflowTransaction.service';
import { CreateBankTransactionService } from './commands/CreateBankTransaction.service';
import { GetBankTransactionService } from './queries/GetBankTransaction.service';
import {
  IBankAccountsFilter,
  ICashflowAccountTransactionsQuery,
} from './types/BankingTransactions.types';
import { GetBankAccountsService } from './queries/GetBankAccounts.service';
import { CreateBankTransactionDto } from './dtos/CreateBankTransaction.dto';
import { GetBankAccountTransactionsService } from './queries/GetBankAccountTransactions/GetBankAccountTransactions.service';
import { GetUncategorizedTransactions } from './queries/GetUncategorizedTransactions';
import { GetUncategorizedBankTransactionService } from './queries/GetUncategorizedBankTransaction.service';
import { GetUncategorizedTransactionsQueryDto } from './dtos/GetUncategorizedTransactionsQuery.dto';
import { GetPendingBankAccountTransactions } from './queries/GetPendingBankAccountTransaction.service';
import { GetPendingTransactionsQueryDto } from './dtos/GetPendingTransactionsQuery.dto';
import { GetAutofillCategorizeTransactionService } from './queries/GetAutofillCategorizeTransaction/GetAutofillCategorizeTransaction.service';
import { GetBankTransactionsQueryDto } from './dtos/GetBankTranasctionsQuery.dto';

@Injectable()
export class BankingTransactionsApplication {
  constructor(
    private readonly createTransactionService: CreateBankTransactionService,
    private readonly deleteTransactionService: DeleteCashflowTransaction,
    private readonly getCashflowTransactionService: GetBankTransactionService,
    private readonly getBankAccountsService: GetBankAccountsService,
    private readonly getBankAccountTransactionsService: GetBankAccountTransactionsService,
    private readonly getBankAccountUncategorizedTransitionsService: GetUncategorizedTransactions,
    private readonly getBankAccountUncategorizedTransactionService: GetUncategorizedBankTransactionService,
    private readonly getPendingBankAccountTransactionsService: GetPendingBankAccountTransactions,
    private readonly getAutofillCategorizeTransactionService: GetAutofillCategorizeTransactionService,
    private readonly uow: UnitOfWork,
    private readonly transactionActions: TransactionActionsService,
  ) {}

  /**
   * Creates a new cashflow transaction.
   * @param {ICashflowNewCommandDTO} transactionDTO
   * @returns
   */
  public createTransaction(transactionDTO: CreateBankTransactionDto) {
    const splits = transactionDTO.splits ?? [];
    if (splits.length === 0) {
      return this.createTransactionService.newCashflowTransaction(transactionDTO);
    }
    // С частями (FT-023 ТЗ-3) — одной транзакцией: части не сошлись с
    // суммой или у статьи нет счёта — не создаётся и сама операция.
    return this.uow.withTransaction(async (trx) => {
      const transaction = await this.createTransactionService.newCashflowTransaction(
        transactionDTO,
        undefined,
        trx,
      );
      await this.transactionActions.setSplits(
        transaction.id,
        splits.map((line) => ({
          amount: Number(line.amount),
          articleId: Number(line.articleId),
          projectId: line.projectId ?? null,
        })),
        trx,
      );
      return transaction;
    });
  }

  /**
   * Пакетный ввод «Несколько» (FT-024 ТЗ-3): N операций одним запросом.
   *
   * КАЖДАЯ СТРОКА — СВОЯ ТРАНЗАКЦИЯ И СВОЯ ПРОВЕРКА. Проверь мы весь пакет
   * разом, ошибка в седьмой строке не дала бы сохранить и первые шесть; а
   * ТЗ требует ровно обратного: сохранить то, что можно, и сказать, что не
   * так с остальными. Экран оставляет в окне только строки с ошибками.
   */
  public async createTransactionsBulk(items: unknown[]) {
    const results: Array<
      | { index: number; id: number }
      | { index: number; error: string; message: string; fields?: string[] }
    > = [];
    for (const [index, raw] of (items ?? []).entries()) {
      const dto = plainToInstance(CreateBankTransactionDto, raw ?? {});
      const invalid = await validate(dto as object, { whitelist: true });
      if (invalid.length > 0) {
        results.push({
          index,
          error: 'VALIDATION_FAILED',
          message: 'Строка заполнена не полностью или неверно',
          fields: invalid.map((error) => error.property),
        });
        continue;
      }
      try {
        const created: any = await this.createTransaction(dto);
        results.push({ index, id: Number(created.id) });
      } catch (error: any) {
        results.push({
          index,
          error: error?.errorType ?? error?.name ?? 'CREATE_FAILED',
          message: error?.message ?? 'Не удалось сохранить операцию',
        });
      }
    }
    const created = results.filter((result) => 'id' in result).length;
    return { created, failed: results.length - created, results };
  }

  /**
   * Deletes the given cashflow transaction.
   * @param {number} cashflowTransactionId - Cashflow transaction id.
   * @returns {Promise<{ oldCashflowTransaction: ICashflowTransaction }>}
   */
  public deleteTransaction(cashflowTransactionId: number) {
    return this.deleteTransactionService.deleteCashflowTransaction(
      cashflowTransactionId,
    );
  }

  /**
   * Retrieves the bank transactions of the given bank id.
   * @param {ICashflowAccountTransactionsQuery} query
   */
  public getBankAccountTransactions(query: GetBankTransactionsQueryDto) {
    return this.getBankAccountTransactionsService.bankAccountTransactions(
      query,
    );
  }

  /**
   * Retrieves specific cashflow transaction.
   * @param {number} cashflowTransactionId
   * @returns
   */
  public getTransaction(cashflowTransactionId: number) {
    return this.getCashflowTransactionService.getBankTransaction(
      cashflowTransactionId,
    );
  }

  /**
   * Retrieves the cashflow accounts.
   * @param {IBankAccountsFilter} filterDTO
   */
  public getBankAccounts(filterDTO: IBankAccountsFilter) {
    return this.getBankAccountsService.getBankAccounts(filterDTO);
  }

  /**
   * Retrieves the uncategorized cashflow transactions.
   * @param {number} accountId - Account id.
   * @param {IGetUncategorizedTransactionsQuery} query - Query.
   */
  public getBankAccountUncategorizedTransactions(
    accountId: number | undefined,
    query: GetUncategorizedTransactionsQueryDto,
  ) {
    return this.getBankAccountUncategorizedTransitionsService.getTransactions(
      accountId,
      query,
    );
  }

  /**
   * Retrieves specific uncategorized cashflow transaction.
   * @param {number} uncategorizedTransactionId - Uncategorized transaction id.
   */
  public getUncategorizedTransaction(uncategorizedTransactionId: number) {
    return this.getBankAccountUncategorizedTransactionService.getTransaction(
      uncategorizedTransactionId,
    );
  }

  /**
   * Retrieves the pending bank account transactions.
   * @param {GetPendingTransactionsQueryDto} filter - Pending transactions query.
   */
  public getPendingBankAccountTransactions(
    filter?: GetPendingTransactionsQueryDto,
  ) {
    return this.getPendingBankAccountTransactionsService.getPendingTransactions(
      filter,
    );
  }

  /**
   * Retrieves the autofill values of categorize transactions form.
   * @param {Array<number> | number} uncategorizeTransactionsId - Uncategorized transactions ids.
   */
  public getAutofillCategorizeTransaction(
    uncategorizeTransactionsId: Array<number> | number,
  ) {
    return this.getAutofillCategorizeTransactionService.getAutofillCategorizeTransaction(
      uncategorizeTransactionsId,
    );
  }
}
