// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { SaleInvoicesModule } from '@/modules/SaleInvoices/SaleInvoices.module';
import { DebtsController } from './Debts.controller';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewService } from './queries/GetDebtsOverview.service';
import { GetContactDebtsService } from './queries/GetContactDebts.service';
import { GetRepaymentPlansService } from './queries/GetRepaymentPlans.service';
import { SendDebtReminderService } from './commands/SendDebtReminder.service';
import { CommandRepaymentPlanValidatorService } from './commands/CommandRepaymentPlanValidator.service';
import { CreateRepaymentPlanService } from './commands/CreateRepaymentPlan.service';
import { EditRepaymentPlanService } from './commands/EditRepaymentPlan.service';
import { DeleteRepaymentPlanService } from './commands/DeleteRepaymentPlan.service';
import { MarkInstallmentPaidService } from './commands/MarkInstallmentPaid.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule, SaleInvoicesModule],
  controllers: [DebtsController],
  providers: [
    DebtsApplication,
    GetDebtsOverviewService,
    GetContactDebtsService,
    GetRepaymentPlansService,
    SendDebtReminderService,
    CommandRepaymentPlanValidatorService,
    CreateRepaymentPlanService,
    EditRepaymentPlanService,
    DeleteRepaymentPlanService,
    MarkInstallmentPaidService,
  ],
})
export class DebtsModule {}
