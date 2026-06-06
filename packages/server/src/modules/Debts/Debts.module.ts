// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { DebtsController } from './Debts.controller';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewService } from './queries/GetDebtsOverview.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [DebtsController],
  providers: [DebtsApplication, GetDebtsOverviewService],
})
export class DebtsModule {}
