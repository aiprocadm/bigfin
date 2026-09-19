import { Knex } from 'knex';
import * as moment from 'moment';

export interface ILedger {
  entries: ILedgerEntry[];

  getEntries(): ILedgerEntry[];
  /** Разница дебета и кредита; ноль — двойная запись соблюдена. */
  getDebitCreditDifference(): number;
  /** Сходится ли журнал (с копеечным допуском). */
  isBalanced(): boolean;

  filter(cb: (entry: ILedgerEntry) => boolean): ILedger;

  whereAccountId(accountId: number): ILedger;
  whereAccountsIds(accountsIds: number[]): ILedger;
  whereContactId(contactId: number): ILedger;
  whereFromDate(fromDate: Date | string): ILedger;
  whereToDate(toDate: Date | string): ILedger;
  whereCurrencyCode(currencyCode: string): ILedger;
  whereBranch(branchId: number): ILedger;
  whereItem(itemId: number): ILedger;
  whereProject(projectId: number): ILedger;

  getClosingBalance(): number;
  getForeignClosingBalance(): number;
  getClosingDebit(): number;
  getClosingCredit(): number;

  getContactsIds(): number[];
  getAccountsIds(): number[];

  reverse(): ILedger;
  isEmpty(): boolean;
}

export interface ILedgerEntry {
  id?: number;

  credit: number;
  debit: number;

  currencyCode: string;
  exchangeRate: number;

  accountId?: number;
  accountNormal: string;
  contactId?: number;
  date: moment.MomentInput;

  transactionType: string;
  transactionSubType?: string;

  transactionId: number;

  transactionNumber?: string;

  referenceNumber?: string;
  index: number;
  indexGroup?: number;

  note?: string;

  userId?: number;
  itemId?: number;
  branchId?: number;
  projectId?: number;

  taxRateId?: number;
  taxRate?: number;

  entryId?: number;
  createdAt?: Date | string;

  costable?: boolean;

  /**
   * Человек отметил операцию как внутригрупповую (этап 7 ТЗ, §7.2, К2).
   *
   * Только «да». Снять автоматическую пометку этим полем нельзя: если ноги
   * операции и правда принадлежат разным юрлицам, она внутригрупповая по
   * определению, и разрешить сказать «нет» значило бы позволить дважды
   * посчитать одну и ту же выручку в сводном отчёте.
   */
  isIntercompany?: boolean;
}

export interface ISaveLedgerEntryQueuePayload {
  tenantId: number;
  entry: ILedgerEntry;
  trx?: Knex.Transaction;
  /** Внутригрупповая ли операция целиком (этап 7 ТЗ, §7.2). */
  isIntercompany?: boolean;
  /** Юрлицо ноги — наследуется от счёта (этап 8 ТЗ, §8.1). */
  legalEntityId?: number | null;
}

export interface ISaveAccountsBalanceQueuePayload {
  ledger: ILedger;
  tenantId: number;
  accountId: number;
  trx?: Knex.Transaction;
}

export interface ISaleContactsBalanceQueuePayload {
  ledger: ILedger;
  tenantId: number;
  contactId: number;
  trx?: Knex.Transaction;
}
