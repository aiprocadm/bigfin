// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { CostAllocationController } from './CostAllocation.controller';
import { CostAllocationApplication } from './CostAllocation.application';
import { CommandCostAllocationValidatorService } from './commands/CommandCostAllocationValidator.service';
import { CreateCostAllocationRuleService } from './commands/CreateCostAllocationRule.service';
import { EditCostAllocationRuleService } from './commands/EditCostAllocationRule.service';
import { DeleteCostAllocationRuleService } from './commands/DeleteCostAllocationRule.service';
import { GetCostAllocationRulesService } from './queries/GetCostAllocationRules.service';
import { GetDealAllocationService } from './queries/GetDealAllocation.service';
import { AllocationPoolService } from './queries/AllocationPool.service';
import { DealsRevenueService } from './queries/DealsRevenue.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [CostAllocationController],
  providers: [
    CostAllocationApplication,
    // commands
    CommandCostAllocationValidatorService,
    CreateCostAllocationRuleService,
    EditCostAllocationRuleService,
    DeleteCostAllocationRuleService,
    // queries
    GetCostAllocationRulesService,
    GetDealAllocationService,
    AllocationPoolService,
    DealsRevenueService,
    // collaborators injected directly (no ManagementArticlesModule import needed)
    ArticlesPlRollupService,
  ],
  exports: [GetDealAllocationService],
})
export class CostAllocationModule {}
