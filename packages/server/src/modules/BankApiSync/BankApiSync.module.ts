// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BankApiSyncController } from './BankApiSync.controller';
import { BankApiSyncApplication } from './BankApiSync.application';
import { BankApiSyncSettingsService } from './BankApiSyncSettings.service';
import { TinkoffApiService } from './connectors/tinkoff/TinkoffApi.service';
import { ImportTinkoffStatementService } from './commands/ImportTinkoffStatement.service';
import { BankingCategorizeModule } from '../BankingCategorize/BankingCategorize.module';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { FeaturesModule } from '../Features/Features.module';

/**
 * ⑨c Банковские API (волна 1: Тинькофф). Импорт выписки по API в конвейер
 * «Разбор» ⑨ (переиспущает `CreateUncategorizedTransactionService`).
 * За флагом `bank_api_sync`. Альфа — второй коннектор тем же путём.
 */
@Module({
  imports: [BankingCategorizeModule, BankingTransactionsModule, FeaturesModule],
  controllers: [BankApiSyncController],
  providers: [
    BankApiSyncApplication,
    BankApiSyncSettingsService,
    TinkoffApiService,
    ImportTinkoffStatementService,
  ],
})
export class BankApiSyncModule {}
