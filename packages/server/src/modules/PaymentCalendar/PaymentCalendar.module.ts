import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ExchangeRatesModule } from '@/modules/ExchangeRates/ExchangeRates.module';
import { PaymentCalendarController } from './PaymentCalendar.controller';
import { PaymentCalendarApplication } from './PaymentCalendar.application';
import { CommandPlannedOperationValidatorService } from './commands/CommandPlannedOperationValidator.service';
import { CreatePlannedOperationService } from './commands/CreatePlannedOperation.service';
import { EditPlannedOperationService } from './commands/EditPlannedOperation.service';
import { DeletePlannedOperationService } from './commands/DeletePlannedOperation.service';
import { MaterializePlannedOperationService } from './commands/MaterializePlannedOperation.service';
import { BankingTransactionsModule } from '@/modules/BankingTransactions/BankingTransactions.module';
import { GetPlannedOperationsService } from './queries/GetPlannedOperations.service';
import { GetPaymentCalendarForecastService } from './queries/GetPaymentCalendarForecast.service';
import { FeaturesModule } from '@/modules/Features/Features.module';

@Module({
  imports: [
    FeaturesModule,
    TenancyDatabaseModule,
    TenancyModule,
    ExchangeRatesModule,
    BankingTransactionsModule,
  ],
  controllers: [PaymentCalendarController],
  providers: [
    PaymentCalendarApplication,
    CommandPlannedOperationValidatorService,
    CreatePlannedOperationService,
    EditPlannedOperationService,
    DeletePlannedOperationService,
    MaterializePlannedOperationService,
    GetPlannedOperationsService,
    GetPaymentCalendarForecastService,
  ],
})
export class PaymentCalendarModule {}
