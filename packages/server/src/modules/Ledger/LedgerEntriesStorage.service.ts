import { Knex } from 'knex';
import * as async from 'async';
import { Inject, Injectable } from '@nestjs/common';
import { transformLedgerEntryToTransaction } from './utils';
import {
  ILedgerEntry,
  ISaveLedgerEntryQueuePayload,
} from './types/Ledger.types';
import { ILedger } from './types/Ledger.types';
import { AccountTransaction } from '../Accounts/models/AccountTransaction.model';
import { Account } from '../Accounts/models/Account.model';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { isIntercompanyReference } from '../LegalEntities/utils/intercompany';

// Filter the blank entries.
const filterBlankEntry = (entry: ILedgerEntry) =>
  Boolean(entry.credit || entry.debit);

@Injectable()
export class LedgerEntriesStorageService {
  /**
   * @param {TenantModelProxy<typeof AccountTransaction>} accountTransactionModel - Account transaction model.
   */
  constructor(
    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Saves entries of the given ledger.
   * @param {ILedger} ledger - Ledger.
   * @param {Knex.Transaction} trx - Knex transaction.
   * @returns {Promise<void>}
   */
  public saveEntries = async (ledger: ILedger, trx?: Knex.Transaction) => {
    const saveEntryQueue = async.queue(this.saveEntryTask.bind(this), 10);
    const entries = ledger.filter(filterBlankEntry).getEntries();

    // Внутригрупповая ли операция — решается здесь, потому что здесь видны
    // ВСЕ её ноги сразу. Это единственное место, где пишутся проводки, и
    // через него проходят и переводы, и счета, и ручные операции, и импорт
    // (этап 7 ТЗ, §7.2 п. 1).
    const legalEntityByAccount = await this.getLegalEntityByAccount(
      entries,
      trx,
    );
    const isIntercompany = this.detectIntercompany(
      entries,
      legalEntityByAccount,
    );

    entries.forEach((entry) => {
      saveEntryQueue.push({
        entry,
        trx,
        isIntercompany,
        // Операция наследует юрлицо от своего счёта (§8.1 ТЗ). Переопределять
        // его вручную нельзя — иначе остатки по юрлицам разъедутся.
        legalEntityId:
          legalEntityByAccount.get(Number(entry.accountId)) ?? null,
      });
    });
    if (entries.length > 0) await saveEntryQueue.drain();
  };

  /**
   * Принадлежат ли ноги операции разным юрлицам.
   *
   * Юрлицо операция наследует от счёта — так решено в §8.1 ТЗ, и это
   * единственный способ не дать остаткам разъехаться.
   *
   * Пока колонка юрлица у счетов пуста, ответ всегда «нет»: неизвестное
   * юрлицо не считается «другим», иначе внутригрупповой стала бы каждая
   * операция (правило `intercompany.ts`).
   */
  private detectIntercompany = (
    entries: ILedgerEntry[],
    legalEntityByAccount: Map<number, number | null>,
  ): boolean => {
    const accountIds = [
      ...new Set(entries.map((entry) => entry.accountId).filter(Boolean)),
    ];
    if (accountIds.length < 2) return false;

    return isIntercompanyReference(
      accountIds.map((accountId) => ({
        accountId: Number(accountId),
        legalEntityId: legalEntityByAccount.get(Number(accountId)) ?? null,
      })),
    );
  };

  /**
   * Юрлицо каждого задействованного счёта — одним запросом.
   *
   * Счета читаются один раз на операцию, а не на каждую ногу: у большой
   * ручной проводки ног бывает десятки.
   */
  private getLegalEntityByAccount = async (
    entries: ILedgerEntry[],
    trx?: Knex.Transaction,
  ): Promise<Map<number, number | null>> => {
    const accountIds = [
      ...new Set(entries.map((entry) => entry.accountId).filter(Boolean)),
    ];
    const byAccount = new Map<number, number | null>();
    if (accountIds.length === 0) return byAccount;

    const accounts: any[] = await this.accountModel()
      .query(trx)
      .whereIn('id', accountIds);

    accounts.forEach((account) => {
      byAccount.set(
        Number(account.id),
        account.legalEntityId != null ? Number(account.legalEntityId) : null,
      );
    });
    return byAccount;
  };

  /**
   * Deletes the ledger entries.
   * @param {ILedger} ledger - Ledger.
   * @param {Knex.Transaction} trx - Knex transaction.
   */
  public deleteEntries = async (ledger: ILedger, trx?: Knex.Transaction) => {
    const entriesIds = ledger
      .getEntries()
      .filter((e) => e.entryId)
      .map((e) => e.entryId);

    await this.accountTransactionModel()
      .query(trx)
      .whereIn('id', entriesIds)
      .delete();
  };

  /**
   * Saves the ledger entry to the account transactions repository.
   * @param {ILedgerEntry} entry - Ledger entry.
   * @param {Knex.Transaction} trx
   * @returns {Promise<void>}
   */
  private saveEntry = async (
    entry: ILedgerEntry,
    trx?: Knex.Transaction,
    isIntercompany = false,
    legalEntityId: number | null = null,
  ): Promise<void> => {
    const transaction = transformLedgerEntryToTransaction(entry);

    await this.accountTransactionModel()
      .query(trx)
      .insert({ ...transaction, isIntercompany, legalEntityId } as any);
  };

  /**
   * Save the ledger entry to the transactions repository async task.
   * @param {ISaveLedgerEntryQueuePayload} task - Task payload.
   * @returns {Promise<void>}
   */
  private saveEntryTask = async (
    task: ISaveLedgerEntryQueuePayload,
  ): Promise<void> => {
    const { entry, trx, isIntercompany, legalEntityId } = task;

    await this.saveEntry(entry, trx, isIntercompany, legalEntityId ?? null);
  };
}
