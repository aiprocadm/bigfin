import { Ledger } from '@/modules/Ledger/Ledger';
import { ManualJournal } from '../models/ManualJournal';
import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { ManualJournalEntry } from '../models/ManualJournalEntry';
import { ServiceError } from '@/modules/Items/ServiceError';
import { EXCHANGE_RATE_ERRORS } from '@/common/validators/assertValidExchangeRate';

export class ManualJournalGL {
  manualJournal: ManualJournal;
  baseCurrencyCode: string;

  constructor(manualJournal: ManualJournal) {
    this.manualJournal = manualJournal;
  }

  /**
   * Sets the base currency code of the organization.
   * @param {string} baseCurrencyCode - The base currency code.
   * @returns {ManualJournalGL}
   */
  public setBaseCurrencyCode(baseCurrencyCode: string): ManualJournalGL {
    this.baseCurrencyCode = baseCurrencyCode;

    return this;
  }

  /**
   * Курс, по которому суммы проводки переводятся в базовую валюту (Р1 срез 3).
   *
   * Раньше суммы уходили в журнал как есть: 1000 USD при курсе 80 ложились
   * рядом с рублями как 1000 — занижение в 80 раз, и дебет с кредитом при
   * этом сходились, так что ошибка была бесшумной.
   *
   * Для проводки в базовой валюте курс не нужен — там честная единица.
   * Для валютной пустой курс не подменяется единицей, а падает: молчаливое
   * «один к одному» и есть та самая ошибка.
   */
  private get exchangeRate(): number {
    const rate = Number(this.manualJournal.exchangeRate);

    if (Number.isFinite(rate) && rate > 0) {
      return rate;
    }
    const isForeign =
      !!this.manualJournal.currencyCode &&
      !!this.baseCurrencyCode &&
      this.manualJournal.currencyCode !== this.baseCurrencyCode;

    if (isForeign) {
      throw new ServiceError(EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_REQUIRED);
    }
    return 1;
  }

  /**
   * Retrieves the ledger of the given manual journal.
   * @param {ManualJournal} manualJournal - The manual journal.
   * @returns {Ledger}
   */
  public getManualJournalGLedger = () => {
    const entries = this.getManualJournalGLEntries();

    return new Ledger(entries);
  };

  /**
   * Retrieves the common entry details of the manual journal
   * @param {IManualJournal} manualJournal - The manual journal.
   * @returns {Partial<ILedgerEntry>}
   */
  public get manualJournalCommonEntry() {
    return {
      transactionNumber: this.manualJournal.journalNumber,
      referenceNumber: this.manualJournal.reference,
      createdAt: this.manualJournal.createdAt,
      date: this.manualJournal.date,
      currencyCode: this.manualJournal.currencyCode,
      exchangeRate: this.manualJournal.exchangeRate,

      transactionType: 'Journal',
      transactionId: this.manualJournal.id,

      userId: this.manualJournal.userId,

      // Человек отметил операцию как внутригрупповую (остаток К2).
      // Признак живёт у документа, потому что проводки при каждой правке
      // пересобираются заново, а выбор человека обязан её пережить.
      isIntercompany: Boolean((this.manualJournal as any).isIntercompany),
    };
  }

  /**
   * Retrieves the ledger entry of the given manual journal and
   * its associated entry.
   * @param {IManualJournal} manualJournal - The manual journal.
   * @param {IManualJournalEntry} entry - The manual journal entry.
   * @returns {ILedgerEntry}
   */
  public getManualJournalEntry(entry: ManualJournalEntry): ILedgerEntry {
    const commonEntry = this.manualJournalCommonEntry;
    const exchangeRate = this.exchangeRate;

    return {
      ...commonEntry,
      debit: entry.debit * exchangeRate,
      credit: entry.credit * exchangeRate,
      accountId: entry.accountId,

      contactId: entry.contactId,
      note: entry.note,

      index: entry.index,
      accountNormal: entry.account.accountNormal,

      branchId: entry.branchId,
      projectId: entry.projectId,
    };
  }

  /**
   * Retrieves the ledger entries of the given manual journal.
   * @param {IManualJournal} manualJournal - The manual journal.
   * @returns {ILedgerEntry[]}
   */
  public getManualJournalGLEntries = (): ILedgerEntry[] => {
    return this.manualJournal.entries
      .map((entry) => this.getManualJournalEntry(entry))
      .flat();
  };
}
