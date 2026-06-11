// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { LedgerModule } from '@/modules/Ledger/Ledger.module';
import { DividendsController } from './Dividends.controller';
import { DividendsApplication } from './Dividends.application';
import { GetDividendsSummaryService } from './queries/GetDividendsSummary.service';
import { GetDividendPayoutsService } from './queries/GetDividendPayouts.service';
import { CreateDividendPayoutService } from './commands/CreateDividendPayout.service';
import { DeleteDividendPayoutService } from './commands/DeleteDividendPayout.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule, LedgerModule],
  controllers: [DividendsController],
  providers: [
    DividendsApplication,
    GetDividendsSummaryService,
    GetDividendPayoutsService,
    CreateDividendPayoutService,
    DeleteDividendPayoutService,
  ],
})
export class DividendsModule {}
