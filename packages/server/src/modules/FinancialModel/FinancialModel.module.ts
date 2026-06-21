// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { FinancialModelController } from './FinancialModel.controller';
import { FinancialModelApplication } from './FinancialModel.application';
import { GetFinancialOverviewService } from './queries/GetFinancialOverview.service';
import { GetSegmentProfitabilityService } from './queries/GetSegmentProfitability.service';
import { GetProductMarginService } from './queries/GetProductMargin.service';
import { GetMarketingMetricsService } from './queries/GetMarketingMetrics.service';
import { GetBreakEvenService } from './queries/GetBreakEven.service';
import { MarketingDataService } from './commands/MarketingData.service';
import { CostBehaviorService } from './commands/CostBehavior.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [FinancialModelController],
  providers: [
    FinancialModelApplication,
    GetFinancialOverviewService,
    GetSegmentProfitabilityService,
    GetProductMarginService,
    GetMarketingMetricsService,
    GetBreakEvenService,
    MarketingDataService,
    CostBehaviorService,
    // collaborator injected directly (no ManagementArticlesModule import needed)
    ArticlesPlRollupService,
  ],
})
export class FinancialModelModule {}
