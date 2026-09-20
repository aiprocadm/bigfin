import { Knex } from 'knex';
import { UncategorizedBankTransaction } from '../models/UncategorizedBankTransaction';
import { BankTransaction } from '../models/BankTransaction';
import { CreateBankTransactionDto } from '../dtos/CreateBankTransaction.dto';
import { INumberFormatQuery } from '@/modules/FinancialStatements/types/Report.types';
import { ISortOrder } from '@/modules/DynamicListing/DynamicFilter/DynamicFilter.types';

export interface IPendingTransactionRemovingEventPayload {
  uncategorizedTransactionId: number;
  pendingTransaction: UncategorizedBankTransaction;
  trx?: Knex.Transaction;
}

export interface IPendingTransactionRemovedEventPayload {
  uncategorizedTransactionId: number;
  pendingTransaction: UncategorizedBankTransaction;
  trx?: Knex.Transaction;
}

export interface IGetRecognizedTransactionsQuery {
  page?: number;
  pageSize?: number;
  accountId?: number;
  minDate?: Date;
  maxDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface ICashflowCommandDTO {
  date: Date;

  transactionNumber: string;
  referenceNo: string;
  transactionType: string;
  description: string;

  amount: number;
  exchangeRate: number;
  currencyCode: string;

  creditAccountId: number;
  cashflowAccountId: number;

  publish: boolean;
  branchId?: number;
  contactId?: number;
  plaidTransactionId?: string;
}

export interface ICashflowNewCommandDTO extends ICashflowCommandDTO {
  plaidAccountId?: string;
  uncategorizedTransactionId?: number;
}

export interface IBankAccountsFilter {
  inactiveMode: boolean;
  stringifiedFilterRoles?: string;

  // Порядок сортировки — не любая строка, а «по возрастанию» или «по
  // убыванию»: этот отбор уходит в общий механизм списков, который принимает
  // именно их.
  sortOrder: ISortOrder;
  columnSortBy: string;
}

export enum CashflowDirection {
  IN = 'in',
  OUT = 'out',
}

export interface ICommandCashflowCreatingPayload {
  trx: Knex.Transaction;
  newTransactionDTO: ICashflowNewCommandDTO;
}

export interface ICommandCashflowCreatedPayload {
  newTransactionDTO: CreateBankTransactionDto;
  cashflowTransaction: BankTransaction;
  trx: Knex.Transaction;
}

export interface ICommandCashflowDeletingPayload {
  oldCashflowTransaction: BankTransaction;
  trx: Knex.Transaction;
}

export interface ICommandCashflowDeletedPayload {
  cashflowTransactionId: number;
  oldCashflowTransaction: BankTransaction;
  trx: Knex.Transaction;
}

export interface ICashflowTransactionCategorizedPayload {
  uncategorizedTransactions: Array<UncategorizedBankTransaction>;
  cashflowTransaction: BankTransaction;
  oldUncategorizedTransactions: Array<UncategorizedBankTransaction>;
  categorizeDTO: any;
  trx: Knex.Transaction;
}

export interface ICashflowTransactionUncategorizingPayload {
  uncategorizedTransactionId: number;
  oldUncategorizedTransactions: Array<UncategorizedBankTransaction>;
  trx: Knex.Transaction;
}

export interface ICashflowTransactionUncategorizedPayload {
  uncategorizedTransactionId: number;
  uncategorizedTransactions: Array<UncategorizedBankTransaction>;
  oldMainUncategorizedTransaction: UncategorizedBankTransaction;
  oldUncategorizedTransactions: Array<UncategorizedBankTransaction>;
  trx: Knex.Transaction;
}

export enum CashflowAction {
  Create = 'Create',
  Delete = 'Delete',
  View = 'View',
}

export interface CategorizeTransactionAsExpenseDTO {
  expenseAccountId: number;
  exchangeRate: number;
  referenceNo: string;
  description: string;
  branchId?: number;
}

export interface IGetUncategorizedTransactionsQuery {
  page?: number;
  pageSize?: number;
  minDate?: Date;
  maxDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface ICashflowAccountTransactionsQuery {
  page: number;
  pageSize: number;
  /** Пусто — операции по всем счетам организации (этап 3 ТЗ). */
  accountId?: number;
  /** Отбор по статье учёта вместе с подстатьями (FIN-005 ТЗ-2). */
  articleId?: number;
  /** Начало периода, `YYYY-MM-DD`. */
  fromDate?: string;
  /** Конец периода, `YYYY-MM-DD`. */
  toDate?: string;
  /** Приход (`in`) или расход (`out`). */
  flow?: 'in' | 'out';
  /** Контрагент операции. */
  contactId?: number;
  /** Поиск по номеру, номеру-ссылке и примечанию. */
  search?: string;
  /** Сумма от. */
  minAmount?: number;
  /** Сумма до. */
  maxAmount?: number;
  numberFormat: INumberFormatQuery;
}

export interface ICashflowAccountTransaction {
  /**
   * Состояния строки: «нам должны», «мы должны», «просрочено», «план»
   * (FIN-003 ТЗ-2). Список, а не одно значение: «нам должны» и
   * «просрочено» — разные факты, и человеку нужны оба.
   */
  states?: Array<{
    kind: string;
    dueDate?: string | null;
    documentId?: number | null;
    documentType?: string | null;
  }>;
  withdrawal: number;
  deposit: number;
  runningBalance: number;

  formattedWithdrawal: string;
  formattedDeposit: string;
  formattedRunningBalance: string;

  transactionNumber: string;
  referenceNumber: string;

  referenceId: number;
  referenceType: string;

  formattedTransactionType: string;

  balance: number;
  formattedBalance: string;

  date: Date;
  formattedDate: string;

  status: string;
  formattedStatus: string;

  uncategorizedTransactionId: number;

  /** Счёт операции — нужен списку по всем счетам (этап 3 ТЗ). */
  accountId?: number;
  accountName?: string;
  /** Контрагент операции. */
  contactId?: number;
  contactName?: string;
  /** Назначение платежа. */
  note?: string;
}