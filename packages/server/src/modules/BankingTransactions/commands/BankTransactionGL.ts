import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { BankTransaction } from '../models/BankTransaction';
import { transformCashflowTransactionType } from '../utils';
import { Ledger } from '@/modules/Ledger/Ledger';
import { splitByAmounts } from '@/modules/BankRules/utils/splitShares';

/**
 * Часть операции для проводок (FT-031 ТЗ-3): куда уходит доля суммы.
 * Сумма — в валюте операции; перевод в валюту учёта делается здесь.
 */
export interface BankTransactionGLSplit {
  accountId: number;
  accountNormal?: string;
  projectId?: number | null;
  amount: number;
}

export class BankTransactionGL {
  private bankTransactionModel: BankTransaction;
  private splits: BankTransactionGLSplit[];
  /**
   * @param {BankTransaction} bankTransactionModel - The bank transaction model.
   * @param splits - части операции; пусто — операция проводится целиком.
   */
  constructor(bankTransactionModel: BankTransaction, splits: BankTransactionGLSplit[] = []) {
    this.bankTransactionModel = bankTransactionModel;
    this.splits = splits;
  }

  /**
   * Retrieves the common entry of cashflow transaction.
   * @returns {Partial<ILedgerEntry>}
   */
  private get commonEntry() {
    const { entries, ...transaction } = this.bankTransactionModel;

    return {
      date: this.bankTransactionModel.date,
      currencyCode: this.bankTransactionModel.currencyCode,
      exchangeRate: this.bankTransactionModel.exchangeRate,

      transactionType: 'CashflowTransaction',
      transactionId: this.bankTransactionModel.id,
      transactionNumber: this.bankTransactionModel.transactionNumber,
      transactionSubType: transformCashflowTransactionType(
        this.bankTransactionModel.transactionType,
      ),
      referenceNumber: this.bankTransactionModel.referenceNo,

      note: this.bankTransactionModel.description,

      branchId: this.bankTransactionModel.branchId,
      userId: this.bankTransactionModel.userId,

      // Человек отметил операцию как внутригрупповую (остаток К2).
      // Признак живёт у документа: проводки при правке пересобираются
      // заново, а выбор человека обязан её пережить.
      isIntercompany: Boolean(
        (this.bankTransactionModel as any).isIntercompany,
      ),

      // Месяц начисления (FT-013 ТЗ-3) живёт у документа и переносится на
      // каждую проводку: отчёт о прибыли читает проводки.
      accrualPeriod: (this.bankTransactionModel as any).accrualPeriod ?? null,

      // Направление (FT-030 ТЗ-3) — так же: отчёты по направлениям читают
      // его у проводок.
      projectId: (this.bankTransactionModel as any).projectId ?? null,
    };
  }

  /**
   * Retrieves the cashflow debit GL entry.
   * @returns {ILedgerEntry}
   */
  private get cashflowDebitGLEntry(): ILedgerEntry {
    const commonEntry = this.commonEntry;

    return {
      ...commonEntry,
      accountId: this.bankTransactionModel.cashflowAccountId,
      credit: this.bankTransactionModel.isCashCredit
        ? this.bankTransactionModel.localAmount
        : 0,
      debit: this.bankTransactionModel.isCashDebit
        ? this.bankTransactionModel.localAmount
        : 0,
      accountNormal: this.bankTransactionModel?.cashflowAccount?.accountNormal,
      index: 1,
    };
  }

  /**
   * Retrieves the cashflow credit GL entry.
   * @returns {ILedgerEntry}
   */
  private get cashflowCreditGLEntry(): ILedgerEntry {
    return {
      ...this.commonEntry,
      credit: this.bankTransactionModel.isCashDebit
        ? this.bankTransactionModel.localAmount
        : 0,
      debit: this.bankTransactionModel.isCashCredit
        ? this.bankTransactionModel.localAmount
        : 0,
      accountId: this.bankTransactionModel.creditAccountId,
      accountNormal: this.bankTransactionModel.creditAccount.accountNormal,
      index: 2,
    };
  }

  /**
   * Retrieves the cashflow transaction GL entry.
   * @returns {ILedgerEntry[]}
   */
  private getJournalEntries(): ILedgerEntry[] {
    const debitEntry = this.cashflowDebitGLEntry;
    if (this.splits.length > 0) {
      // Деньги ушли одной суммой — проводка по счёту денег одна и без
      // направления: у частей они разные.
      return [{ ...debitEntry, projectId: null }, ...this.splitCreditGLEntries];
    }
    const creditEntry = this.cashflowCreditGLEntry;

    return [debitEntry, creditEntry];
  }

  /**
   * Проводки «куда» по частям (FT-031 ТЗ-3): в отчёты идут части, в сверку
   * с банком — одна операция по счёту денег.
   *
   * Суммы частей в валюте учёта раскладываются в копейках от суммы проводки
   * по счёту денег, остаток — первой части: иначе при курсе ≠ 1 части
   * разошлись бы с деньгами на копейку, и проводка не сошлась бы.
   */
  private get splitCreditGLEntries(): ILedgerEntry[] {
    const local = this.bankTransactionModel.localAmount;
    // Делим ПО СУММАМ частей в целых копейках, а не через проценты: доля
    // 11/12 = 91,666…% после округления вниз теряла копейку, и части 11 + 1
    // проводились как 11,01 + 0,99 (найдено живой проверкой этапа 37).
    const localParts = splitByAmounts(
      local,
      this.splits.map((part) => Number(part.amount)),
    );
    const isCashDebit = this.bankTransactionModel.isCashDebit;

    return this.splits.map((part, index) => ({
      ...this.commonEntry,
      accountId: part.accountId,
      accountNormal: part.accountNormal,
      projectId: part.projectId ?? null,
      credit: isCashDebit ? localParts[index] : 0,
      debit: isCashDebit ? 0 : localParts[index],
      index: 2 + index,
    })) as ILedgerEntry[];
  }

  /**
   * Retrieves the cashflow GL ledger.
   * @returns {Ledger}
   */
  public getCashflowLedger() {
    const entries = this.getJournalEntries();

    return new Ledger(entries);
  }
}
