// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { ZenmoneyImportController } from './ZenmoneyImport.controller';
import { ZenmoneyImportApplication } from './ZenmoneyImport.application';
import { ZenmoneyImportSettingsService } from './ZenmoneyImportSettings.service';
import { ZenmoneyApiService } from './ZenmoneyApi.service';
import { ZenmoneyImportService } from './ZenmoneyImport.service';
import { BankingCategorizeModule } from '../BankingCategorize/BankingCategorize.module';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { FeaturesModule } from '../Features/Features.module';

/**
 * ⑨b Импорт Дзенмани: операции личных финансов → конвейер «Разбор» ⑨
 * (переиспущает `CreateUncategorizedTransactionService`). Флаг `zenmoney_import`.
 */
@Module({
  imports: [BankingCategorizeModule, BankingTransactionsModule, FeaturesModule],
  controllers: [ZenmoneyImportController],
  providers: [
    ZenmoneyImportApplication,
    ZenmoneyImportSettingsService,
    ZenmoneyApiService,
    ZenmoneyImportService,
  ],
})
export class ZenmoneyImportModule {}
