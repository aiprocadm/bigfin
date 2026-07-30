import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { BankConnectorsRegistry } from '../connectors/BankConnectors.registry';
import { BankApiSyncSettingsService } from '../BankApiSyncSettings.service';
import { BankProviderId } from '../connectors/BankProvider.types';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';

export interface BankApiImportResult {
  imported: number;
  skipped: number;
}

export const BANK_IMPORT_ERRORS = {
  NOT_CONNECTED: 'BANK_NOT_CONNECTED',
};

/**
 * Импорт выписки по API любого подключённого банка в конвейер «Разбор» ⑨:
 * тянет операции за период и создаёт необработанные операции с дедупом по
 * `(accountId, external_id)`. Знак суммы: приход > 0, расход < 0.
 */
@Injectable()
export class ImportBankStatementService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly registry: BankConnectorsRegistry,
    private readonly settings: BankApiSyncSettingsService,
    private readonly createUncategorized: CreateUncategorizedTransactionService,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,
  ) {}

  /**
   * @param {BankProviderId} provider — банк.
   * @param {number} accountId — денежный счёт Bigfin.
   * @param {string} accountNumber — расчётный счёт в банке.
   * @param {string} currencyCode
   * @param {string} from — ISO-дата.
   * @param {string} to — ISO-дата.
   */
  public async import(
    provider: BankProviderId,
    accountId: number,
    accountNumber: string,
    currencyCode: string,
    from: string,
    to: string,
  ): Promise<BankApiImportResult> {
    const credentials = await this.settings.getCredentials(provider);
    if (!credentials) {
      throw new ServiceError(BANK_IMPORT_ERRORS.NOT_CONNECTED);
    }
    const connector = this.registry.get(provider);
    const operations = await connector.fetchOperations(
      credentials,
      accountNumber,
      from,
      to,
    );

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      let imported = 0;
      let skipped = 0;

      for (const rec of operations) {
        if (!rec.date || !rec.amount) {
          skipped++;
          continue;
        }
        const exists = await this.uncategorizedModel()
          .query(trx)
          .findOne({ accountId, externalId: rec.externalId });
        if (exists) {
          skipped++;
          continue;
        }
        await this.createUncategorized.create(
          {
            date: rec.date,
            accountId,
            amount: rec.amount,
            currencyCode,
            payee: rec.payee ?? undefined,
            payeeInn: rec.payeeInn ?? undefined,
            externalId: rec.externalId,
            referenceNo: rec.referenceNo ?? undefined,
            description: rec.description ?? undefined,
          } as any,
          trx,
        );
        imported++;
      }
      return { imported, skipped };
    });
  }
}
