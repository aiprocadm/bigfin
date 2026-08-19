// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { CostAllocationModule } from '@/modules/CostAllocation/CostAllocation.module';
import { DealsController } from './Deals.controller';
import { DealsApplication } from './Deals.application';
import { DealStagesController } from './DealStages.controller';
import { DealStagesApplication } from './DealStages.application';
import { GetDealsService } from './queries/GetDeals.service';
import { GetDealService } from './queries/GetDeal.service';
import { GetDealsSummaryService } from './queries/GetDealsSummary.service';
import { GetDealProfitabilityService } from './queries/GetDealProfitability.service';
import { GetDealStagesService } from './queries/GetDealStages.service';
import { CommandDealValidatorService } from './commands/CommandDealValidator.service';
import { CommandDealStageValidatorService } from './commands/CommandDealStageValidator.service';
import { CreateDealService } from './commands/CreateDeal.service';
import { EditDealService } from './commands/EditDeal.service';
import { DeleteDealService } from './commands/DeleteDeal.service';
import { CreateDealStageService } from './commands/CreateDealStage.service';
import { EditDealStageService } from './commands/EditDealStage.service';
import { DeleteDealStageService } from './commands/DeleteDealStage.service';

@Module({
  // FeaturesModule — ради FeatureGuard на контроллерах: без него приложение
  // не поднимется вовсе («Nest can't resolve dependencies»), а тесты этого
  // не видят (М2 карты v15).
  imports: [
    FeaturesModule,
    TenancyDatabaseModule,
    TenancyModule,
    CostAllocationModule,
  ],
  controllers: [DealsController, DealStagesController],
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
    DealStagesApplication,
    GetDealStagesService,
    CommandDealStageValidatorService,
    CreateDealStageService,
    EditDealStageService,
    DeleteDealStageService,
  ],
  // EditDealService нужен CRM-синхронизации: правка сделки в CRM обновляет
  // связанную сделку в Bigfin.
  exports: [CreateDealService, EditDealService],
})
export class DealsModule {}
