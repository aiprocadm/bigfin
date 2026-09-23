import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ImportBatchesService } from '@/modules/BankingTransactions/commands/ImportBatches.service';
import { mapZenmoneyTransaction } from './mapZenmoney';
import { ZenmoneyApiService } from './ZenmoneyApi.service';
import { ZenmoneyImportSettingsService } from './ZenmoneyImportSettings.service';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';

export interface ZenmoneyImportResult {
  imported: number;
  skipped: number;
}

/**
 * Импорт операций Дзенмани (⑨b) в конвейер «Разбор» ⑨ — дедуп по
 * `(accountId, external_id)`, как импорт 1С/Тинькофф.
 */
@Injectable()
export class ZenmoneyImportService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly api: ZenmoneyApiService,
    private readonly settings: ZenmoneyImportSettingsService,
    private readonly createUncategorized: CreateUncategorizedTransactionService,
    // Пакет импорта (FT-043 ТЗ-3).
    private readonly importBatches: ImportBatchesService,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,
  ) {}

  /**
   * @param {number} accountId — денежный счёт Bigfin.
   * @param {string} currencyCode
   */
  public async import(
    accountId: number,
    currencyCode: string,
  ): Promise<ZenmoneyImportResult> {
    const token = await this.settings.getToken();
    if (!token) throw new ServiceError('ZENMONEY_NOT_CONNECTED');

    // Продолжаем с прошлой метки: заново тянуть годы операций незачем.
    const since = await this.settings.getServerTimestamp();
    const diff = await this.api.getTransactions(token, since);
    const transactions = diff.transactions;

    const result = await this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Один импорт — один пакет: по нему его можно откатить (FT-043).
      const importBatchId = await this.importBatches.open(
        { source: 'api', accountId, fileName: 'zenmoney' },
        trx,
      );
      let imported = 0;
      let skipped = 0;

      for (const tx of transactions) {
        if (tx?.deleted) {
          skipped++;
          continue;
        }
        const rec = mapZenmoneyTransaction(tx);
        if (!rec.date || !rec.amount) {
          skipped++;
          continue;
        }

        const exists = await this.importBatches.isDuplicate(accountId, rec.externalId, trx);
        if (exists) {
          skipped++;
          continue;
        }

        await this.createUncategorized.create(
          {
            date: rec.date,
            importBatchId,
            accountId,
            amount: rec.amount,
            currencyCode,
            payee: rec.payee ?? undefined,
            externalId: rec.externalId,
            description: rec.description ?? undefined,
          } as any,
          trx,
        );
        imported++;
      }
      await this.importBatches.close(importBatchId, imported, trx);
      return { imported, skipped };
    });

    // Метку двигаем только после успешной записи: если импорт упал,
    // следующая попытка заберёт тот же кусок, а не пропустит его.
    if (diff.serverTimestamp > 0) {
      await this.settings.setServerTimestamp(diff.serverTimestamp);
    }
    return result;
  }
}
