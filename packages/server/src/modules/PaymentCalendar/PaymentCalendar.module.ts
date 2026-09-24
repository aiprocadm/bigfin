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
import { GetAccountsCashGapsService } from './queries/GetAccountsCashGaps.service';
import { GetCalendarMatrixService } from './queries/GetCalendarMatrix.service';
import { GapScenariosService } from './queries/GapScenarios.service';
import { AutoConfirmPlansOnFactSubscriber } from './subscribers/AutoConfirmPlansOnFact';
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
    // Матрица «план / факт» и сценарий переноса (FT-050, FT-051 ТЗ-3).
    GetCalendarMatrixService,
    GapScenariosService,
    // Автоподтверждение плана фактом (FT-052 ТЗ-3).
    AutoConfirmPlansOnFactSubscriber,
    PaymentCalendarApplication,
    CommandPlannedOperationValidatorService,
    CreatePlannedOperationService,
    EditPlannedOperationService,
    DeletePlannedOperationService,
    MaterializePlannedOperationService,
    GetPlannedOperationsService,
    GetPaymentCalendarForecastService,
    GetAccountsCashGapsService,
  ],
  // Прогноз спрашивает и сводка на главной (Р3 карты v21). Провайдер чужого
  // модуля должен быть в exports, иначе сервер не поднимается — на этом уже
  // спотыкались дважды; держит сторож moneySummaryDeps.spec.ts.
  // Матрица план/факт нужна и главной — поступления по направлениям (FT-063).
  exports: [GetPaymentCalendarForecastService, GetAccountsCashGapsService, GetCalendarMatrixService],
})
export class PaymentCalendarModule {}
