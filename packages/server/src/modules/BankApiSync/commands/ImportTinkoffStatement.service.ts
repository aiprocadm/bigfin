import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { mapTinkoffOperation } from '../connectors/tinkoff/mapTinkoff';
import { TinkoffApiService } from '../connectors/tinkoff/TinkoffApi.service';
import { BankApiSyncSettingsService } from '../BankApiSyncSettings.service';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';

export interface BankApiImportResult {
  imported: number;
  skipped: number;
}

/**
 * Импорт выписки по API Тинькофф в конвейер «Разбор» ⑨ — тянет операции за
 * период и создаёт необработанные операции (дедуп по `(accountId, external_id)`),
 * как импорт 1С. Знак суммы: приход > 0, расход < 0.
 */
@Injectable()
export class ImportTinkoffStatementService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly api: TinkoffApiService,
    private readonly settings: BankApiSyncSettingsService,
    private readonly createUncategorized: CreateUncategorizedTransactionService,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,
  ) {}

  /**
   * @param {number} accountId — денежный счёт Bigfin.
   * @param {string} accountNumber — расчётный счёт в Тинькофф.
   * @param {string} currencyCode
   * @param {string} from — ISO-дата.
   * @param {string} to — ISO-дата.
   */
  public async import(
    accountId: number,
    accountNumber: string,
    currencyCode: string,
    from: string,
    to: string,
  ): Promise<BankApiImportResult> {
    const token = await this.settings.getTinkoffToken();
    if (!token) throw new ServiceError('TINKOFF_NOT_CONNECTED');

    const operations = await this.api.getOperations(
      token,
      accountNumber,
      from,
      to,
    );

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      let imported = 0;
      let skipped = 0;

      for (const op of operations) {
        const rec = mapTinkoffOperation(op);
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
