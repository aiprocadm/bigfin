// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { BalanceSheetModule } from '@/modules/FinancialStatements/modules/BalanceSheet/BalanceSheet.module';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';

import { CapitalizationController } from './Capitalization.controller';
import { CapitalizationSettingsService } from './CapitalizationSettings.service';
import { GetCapitalizationService } from './queries/GetCapitalization.service';

/**
 * «Сколько стоит мой бизнес» (этап 11 ТЗ).
 *
 * Своих таблиц у раздела нет вовсе: он складывает уже посчитанное — баланс,
 * свёртку статей и справочник юрлиц.
 */
@Module({
  imports: [TenancyDatabaseModule, TenancyModule, BalanceSheetModule],
  controllers: [CapitalizationController],
  providers: [
    GetCapitalizationService,
    CapitalizationSettingsService,
    // Соседняя служба подключается напрямую — как в FinancialModel.
    ArticlesPlRollupService,
  ],
  exports: [GetCapitalizationService],
})
export class CapitalizationModule {}
