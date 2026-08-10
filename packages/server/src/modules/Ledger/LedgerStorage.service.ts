import { Knex } from 'knex';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ILedger } from './types/Ledger.types';
import { LedgerContactsBalanceStorage } from './LedgerContactStorage.service';
import { LedegrAccountsStorage } from './LedgetAccountStorage.service';
import { LedgerEntriesStorageService } from './LedgerEntriesStorage.service';
import { AccountTransaction } from '../Accounts/models/AccountTransaction.model';
import { Ledger } from './Ledger';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { ServiceError } from '../Items/ServiceError';
import { ERRORS } from './Ledger.constants';

@Injectable()
export class LedgerStorageService {
  private readonly logger = new Logger(LedgerStorageService.name);

  /**
   * @param {LedgerContactsBalanceStorage} ledgerContactsBalance - Ledger contacts balance storage.
   * @param {LedegrAccountsStorage} ledgerAccountsBalance - Ledger accounts balance storage.
   * @param {LedgerEntriesStorageService} ledgerEntriesService - Ledger entries storage service.
   */
  constructor(
    private ledgerContactsBalance: LedgerContactsBalanceStorage,
    private ledgerAccountsBalance: LedegrAccountsStorage,
    private ledgerEntriesService: LedgerEntriesStorageService,

    @Inject(AccountTransaction.name)
    private accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * Commit the ledger to the storage layer as one unit-of-work.
   * @param {ILedger} ledger
   * @returns {Promise<void>}
   */
  public commit = async (
    ledger: ILedger,
    trx?: Knex.Transaction,
  ): Promise<void> => {
    // Предохранитель двойной записи. Раньше журнал записывался молча, каким
    // бы он ни был: перекос счёта с НДС (−20 000 ₽) и перекос списания ОС
    // осели в Балансе никем не замеченными.
    //
    // Теперь это ошибка, а не предупреждение. Важно понимать границу: проверка
    // срабатывает только в момент ЗАПИСИ журнала и ничего не перепроверяет в
    // уже сохранённых данных. Значит, сломать существующую организацию она не
    // может — она лишь отказывается записать заведомо кривую проводку. Если
    // такое случится при перепроведении, документ попадёт в отчёт как сбойный,
    // а остальные перепроведутся (см. RepostVatDocumentsService).
    this.assertBalanced(ledger);

    const tasks = [
      // Saves the ledger entries.
      this.ledgerEntriesService.saveEntries(ledger, trx),

      // Mutates the associated accounts balances.
      this.ledgerAccountsBalance.saveAccountsBalance(ledger, trx),

      // Mutates the associated contacts balances.
      this.ledgerContactsBalance.saveContactsBalance(ledger, trx),
    ];
    await Promise.all(tasks);
  };

  /**
   * Не даёт записать журнал, у которого дебет не сошёлся с кредитом.
   *
   * Допуск — половина копейки: хвосты вещественных чисел проблемой не считаем,
   * порог тот же, что у отчёта «Не сходится».
   */
  private assertBalanced(ledger: ILedger): void {
    const asLedger = ledger as Ledger;
    if (typeof asLedger.isBalanced !== 'function' || asLedger.isBalanced()) {
      return;
    }
    const first = asLedger.getEntries()[0];
    const difference = asLedger.getDebitCreditDifference().toFixed(2);
    const document = `${first?.transactionType ?? '?'} #${
      first?.transactionId ?? '?'
    }`;
    const message = `Журнал не сходится на ${difference} — ${document}. Документ не записан: в двойной записи дебет обязан равняться кредиту.`;

    // Пишем и в журнал приложения: в отличие от ответа пользователю, он
    // сохраняет, какой именно документ и на сколько разошёлся.
    this.logger.error(message);

    throw new ServiceError(ERRORS.LEDGER_NOT_BALANCED, message, {
      difference,
      transactionType: first?.transactionType ?? null,
      transactionId: first?.transactionId ?? null,
    });
  }

  /**
   * Deletes the given ledger and revert balances.
   * @param {number} tenantId
   * @param {ILedger} ledger
   * @param {Knex.Transaction} trx
   * @returns {Promise<void>}
   */
  public delete = async (ledger: ILedger, trx?: Knex.Transaction) => {
    const tasks = [
      // Deletes the ledger entries.
      this.ledgerEntriesService.deleteEntries(ledger, trx),

      // Mutates the associated accounts balances.
      this.ledgerAccountsBalance.saveAccountsBalance(ledger, trx),

      // Mutates the associated contacts balances.
      this.ledgerContactsBalance.saveContactsBalance(ledger, trx),
    ];
    await Promise.all(tasks);
  };

  /**
   * Deletes the ledger entries by the given reference.
   * @param {number | number[]} referenceId - The reference ID.
   * @param {string | string[]} referenceType - The reference type.
   * @param {Knex.Transaction} trx - The knex transaction.
   */
  public deleteByReference = async (
    referenceId: number | number[],
    referenceType: string | string[],
    trx?: Knex.Transaction,
  ) => {
    // Retrieves the transactions of the given reference.
    const transactions = await this.accountTransactionModel()
      .query(trx)
      .modify('filterByReference', referenceId, referenceType)
      .withGraphFetched('account');

    // Creates a new ledger from transaction and reverse the entries.
    const reversedLedger = Ledger.fromTransactions(transactions).reverse();

    // Deletes and reverts the balances.
    await this.delete(reversedLedger, trx);
  };
}
