// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { FinancialRatiosController } from './FinancialRatios.controller';
import { GetFinancialRatiosService } from './GetFinancialRatios.service';
import { BalanceSheetModule } from '@/modules/FinancialStatements/modules/BalanceSheet/BalanceSheet.module';
import { ProfitLossSheetModule } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheet.module';
import { FeaturesModule } from '@/modules/Features/Features.module';

/**
 * ㉕ Финансовые коэффициенты («Показатели PRO»): ROE/ROA, ликвидность,
 * долговая нагрузка + вертикальный анализ ОПиУ. За флагом `financial_ratios`.
 */
@Module({
  imports: [BalanceSheetModule, ProfitLossSheetModule, FeaturesModule],
  controllers: [FinancialRatiosController],
  providers: [GetFinancialRatiosService],
})
export class FinancialRatiosModule {}
