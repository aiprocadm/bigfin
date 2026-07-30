// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BankApiSyncController } from './BankApiSync.controller';
import { BankApiSyncApplication } from './BankApiSync.application';
import { BankApiSyncSettingsService } from './BankApiSyncSettings.service';
import { TinkoffApiService } from './connectors/tinkoff/TinkoffApi.service';
import { AlfaApiService } from './connectors/alfa/AlfaApi.service';
import { BankConnectorsRegistry } from './connectors/BankConnectors.registry';
import { ImportBankStatementService } from './commands/ImportBankStatement.service';
import { BankingCategorizeModule } from '../BankingCategorize/BankingCategorize.module';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { FeaturesModule } from '../Features/Features.module';

/**
 * ⑨c Банковские API (волна 1: Тинькофф, Альфа-Банк). Импорт выписки по API
 * в конвейер «Разбор» ⑨ (переиспользует `CreateUncategorizedTransactionService`).
 * За флагом `bank_api_sync`. Новый банк = коннектор в реестре.
 */
@Module({
  imports: [BankingCategorizeModule, BankingTransactionsModule, FeaturesModule],
  controllers: [BankApiSyncController],
  providers: [
    BankApiSyncApplication,
    BankApiSyncSettingsService,
    TinkoffApiService,
    AlfaApiService,
    BankConnectorsRegistry,
    ImportBankStatementService,
  ],
})
export class BankApiSyncModule {}
