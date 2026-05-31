import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { ManagementArticlesModule } from '@/modules/ManagementArticles/ManagementArticles.module';
import { BudgetsController } from './Budgets.controller';
import { BudgetsApplication } from './Budgets.application';
import { CommandBudgetValidatorService } from './commands/CommandBudgetValidator.service';
import { CreateBudgetService } from './commands/CreateBudget.service';
import { EditBudgetService } from './commands/EditBudget.service';
import { DeleteBudgetService } from './commands/DeleteBudget.service';
import { UpsertBudgetLinesService } from './commands/UpsertBudgetLines.service';
import { GetBudgetsService } from './queries/GetBudgets.service';
import { GetBudgetService } from './queries/GetBudget.service';
import { ArticlesCashflowRollupService } from './queries/ArticlesCashflowRollup.service';
import { GetBudgetPlanFactService } from './queries/GetBudgetPlanFact.service';

@Module({
  imports: [TenancyDatabaseModule, ManagementArticlesModule],
  controllers: [BudgetsController],
  providers: [
    BudgetsApplication,
    CommandBudgetValidatorService,
    CreateBudgetService,
    EditBudgetService,
    DeleteBudgetService,
    UpsertBudgetLinesService,
    GetBudgetsService,
    GetBudgetService,
    ArticlesCashflowRollupService,
    GetBudgetPlanFactService,
  ],
})
export class BudgetsModule {}
