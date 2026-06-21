// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { FinancialModelController } from './FinancialModel.controller';
import { FinancialModelApplication } from './FinancialModel.application';
import { GetFinancialOverviewService } from './queries/GetFinancialOverview.service';
import { GetProductMarginService } from './queries/GetProductMargin.service';
import { GetSegmentProfitabilityService } from './queries/GetSegmentProfitability.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [FinancialModelController],
  providers: [
    FinancialModelApplication,
    GetFinancialOverviewService,
    GetSegmentProfitabilityService,
    GetProductMarginService,
    // collaborator injected directly (no ManagementArticlesModule import needed)
    ArticlesPlRollupService,
  ],
})
export class FinancialModelModule {}
