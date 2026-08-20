import { Module } from '@nestjs/common';
import { GetRefundVendorCreditService } from './queries/GetRefundVendorCredit.service';
import { GetRefundVendorCreditsService } from './queries/GetRefundVendorCredits.service';
import { DeleteRefundVendorCreditService } from './commands/DeleteRefundVendorCredit.service';
import { VendorCreditsRefundController } from './VendorCreditsRefund.controller';
import { VendorCreditsRefundApplication } from './VendorCreditsRefund.application';
import { CreateRefundVendorCredit } from './commands/CreateRefundVendorCredit.service';
import { WarehousesModule } from '../Warehouses/Warehouses.module';
import { BranchesModule } from '../Branches/Branches.module';
import { RefundVendorCreditGLEntries } from './commands/RefundVendorCreditGLEntries';
import { RefundVendorCreditGLEntriesSubscriber } from './subscribers/RefundVendorCreditGLEntriesSubscriber';
import { LedgerModule } from '../Ledger/Ledger.module';
import { AccountsModule } from '../Accounts/Accounts.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';

@Module({
  imports: [
    // Нужен TenancyContext: без него Nest не соберёт зависимости
    // и сервер не стартует (грабля С4).
    TenancyModule,
    WarehousesModule,
    BranchesModule,
    LedgerModule,
    AccountsModule,
  ],
  providers: [
    GetRefundVendorCreditService,
    GetRefundVendorCreditsService,
    DeleteRefundVendorCreditService,
    CreateRefundVendorCredit,
    VendorCreditsRefundApplication,
    RefundVendorCreditGLEntries,
    RefundVendorCreditGLEntriesSubscriber,
  ],
  controllers: [VendorCreditsRefundController],
})
export class VendorCreditsRefundModule { }
