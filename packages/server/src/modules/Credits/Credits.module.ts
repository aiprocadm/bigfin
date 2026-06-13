// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { LedgerModule } from '@/modules/Ledger/Ledger.module';
import { CreditsController } from './Credits.controller';
import { CreditsApplication } from './Credits.application';
import { CreateCreditService } from './commands/CreateCredit.service';
import { EditCreditService } from './commands/EditCredit.service';
import { DeleteCreditService } from './commands/DeleteCredit.service';
import { MarkInstallmentPaidService } from './commands/MarkInstallmentPaid.service';
import { GetCreditsService } from './queries/GetCredits.service';
import { GetCreditDetailService } from './queries/GetCreditDetail.service';
import { GetCreditsSummaryService } from './queries/GetCreditsSummary.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule, LedgerModule],
  controllers: [CreditsController],
  providers: [
    CreditsApplication,
    CreateCreditService,
    EditCreditService,
    DeleteCreditService,
    MarkInstallmentPaidService,
    GetCreditsService,
    GetCreditDetailService,
    GetCreditsSummaryService,
  ],
})
export class CreditsModule {}
