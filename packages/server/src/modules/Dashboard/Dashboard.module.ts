import { Module } from '@nestjs/common';
import { DashboardService } from './Dashboard.service';
import { FeaturesModule } from '../Features/Features.module';
import { DashboardController } from './Dashboard.controller';
import { TenancyContext } from '../Tenancy/TenancyContext.service';
import { GetMoneySummaryService } from './queries/GetMoneySummary.service';
import { ARAgingSummaryModule } from '../FinancialStatements/modules/ARAgingSummary/ARAgingSummary.module';
import { APAgingSummaryModule } from '../FinancialStatements/modules/APAgingSummary/APAgingSummary.module';
import { PaymentCalendarModule } from '../PaymentCalendar/PaymentCalendar.module';

@Module({
  // Сводка о деньгах берёт цифры из тех же отчётов, что показывают разделы
  // продукта: второго способа считать те же суммы быть не должно (Г2 v20).
  imports: [
    FeaturesModule,
    ARAgingSummaryModule,
    APAgingSummaryModule,
    PaymentCalendarModule,
  ],
  providers: [DashboardService, TenancyContext, GetMoneySummaryService],
  controllers: [DashboardController],
})
export class DashboardModule {}
