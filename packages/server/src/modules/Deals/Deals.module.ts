// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { DealsController } from './Deals.controller';
import { DealsApplication } from './Deals.application';
import { GetDealsService } from './queries/GetDeals.service';
import { GetDealService } from './queries/GetDeal.service';
import { GetDealsSummaryService } from './queries/GetDealsSummary.service';
import { GetDealProfitabilityService } from './queries/GetDealProfitability.service';
import { CommandDealValidatorService } from './commands/CommandDealValidator.service';
import { CreateDealService } from './commands/CreateDeal.service';
import { EditDealService } from './commands/EditDeal.service';
import { DeleteDealService } from './commands/DeleteDeal.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [DealsController],
  providers: [
    DealsApplication,
    GetDealsService,
    GetDealService,
    GetDealsSummaryService,
    GetDealProfitabilityService,
    CommandDealValidatorService,
    CreateDealService,
    EditDealService,
    DeleteDealService,
    ArticlesPlRollupService,
  ],
})
export class DealsModule {}
