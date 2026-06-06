// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { SaleInvoicesModule } from '@/modules/SaleInvoices/SaleInvoices.module';
import { DebtsController } from './Debts.controller';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewService } from './queries/GetDebtsOverview.service';
import { GetContactDebtsService } from './queries/GetContactDebts.service';
import { SendDebtReminderService } from './commands/SendDebtReminder.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule, SaleInvoicesModule],
  controllers: [DebtsController],
  providers: [
    DebtsApplication,
    GetDebtsOverviewService,
    GetContactDebtsService,
    SendDebtReminderService,
  ],
})
export class DebtsModule {}
