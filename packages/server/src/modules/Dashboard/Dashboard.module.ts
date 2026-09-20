import { Module } from '@nestjs/common';
import { DashboardService } from './Dashboard.service';
import { FeaturesModule } from '../Features/Features.module';
import { DashboardController } from './Dashboard.controller';
import { TenancyContext } from '../Tenancy/TenancyContext.service';
import { GetMoneySummaryService } from './queries/GetMoneySummary.service';
import { ARAgingSummaryModule } from '../FinancialStatements/modules/ARAgingSummary/ARAgingSummary.module';
import { APAgingSummaryModule } from '../FinancialStatements/modules/APAgingSummary/APAgingSummary.module';
import { PaymentCalendarModule } from '../PaymentCalendar/PaymentCalendar.module';
import { ProfitLossSheetModule } from '../FinancialStatements/modules/ProfitLossSheet/ProfitLossSheet.module';
import { GetTaxEstimateService } from './queries/GetTaxEstimate.service';
import { GetDashboardOverviewService } from './queries/GetDashboardOverview.service';
import { GetMoneyWidgetService } from './queries/GetMoneyWidget.service';
import { BankAccountsModule } from '@/modules/BankingAccounts/BankAccounts.module';

@Module({
  // Сводка о деньгах берёт цифры из тех же отчётов, что показывают разделы
  // продукта: второго способа считать те же суммы быть не должно (Г2 v20).
  imports: [
    FeaturesModule,
    ARAgingSummaryModule,
    APAgingSummaryModule,
    PaymentCalendarModule,
    ProfitLossSheetModule,
    // Группы счетов нужны виджету денег: вкладка «По группам» (FIN-017).
    // Провайдер чужого модуля обязан быть в его exports — иначе сервер не
    // поднимается, и на этом в проекте спотыкались трижды.
    BankAccountsModule,
  ],
  providers: [
    DashboardService,
    TenancyContext,
    GetMoneySummaryService,
    GetTaxEstimateService,
    GetDashboardOverviewService,
    GetMoneyWidgetService,
  ],
  controllers: [DashboardController],
  // Оценку налога спрашивает и правило уведомления «скоро платить налог»
  // (Н4 карты v22). Провайдер чужого модуля должен быть в exports, иначе
  // сервер не поднимается — на этом уже спотыкались трижды.
  exports: [GetTaxEstimateService],
})
export class DashboardModule {}
