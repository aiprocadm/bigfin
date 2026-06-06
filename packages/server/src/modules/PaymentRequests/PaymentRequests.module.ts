// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { PaymentRequestsController } from './PaymentRequests.controller';
import { PaymentRequestsApplication } from './PaymentRequests.application';
import { GetPaymentRequestsService } from './queries/GetPaymentRequests.service';
import { GetPaymentRequestService } from './queries/GetPaymentRequest.service';
import { CommandPaymentRequestValidatorService } from './commands/CommandPaymentRequestValidator.service';
import { CreatePaymentRequestService } from './commands/CreatePaymentRequest.service';
import { ApprovePaymentRequestService } from './commands/ApprovePaymentRequest.service';
import { RejectPaymentRequestService } from './commands/RejectPaymentRequest.service';
import { CancelPaymentRequestService } from './commands/CancelPaymentRequest.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [PaymentRequestsController],
  providers: [
    PaymentRequestsApplication,
    GetPaymentRequestsService,
    GetPaymentRequestService,
    CommandPaymentRequestValidatorService,
    CreatePaymentRequestService,
    ApprovePaymentRequestService,
    RejectPaymentRequestService,
    CancelPaymentRequestService,
  ],
})
export class PaymentRequestsModule {}
