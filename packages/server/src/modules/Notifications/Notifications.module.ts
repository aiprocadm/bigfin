// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { MailModule } from '@/modules/Mail/Mail.module';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { ExchangeRatesModule } from '@/modules/ExchangeRates/ExchangeRates.module';
import { GetPaymentCalendarForecastService } from '@/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service';
import { NotificationsController } from './Notifications.controller';
import { NotificationsApplication } from './Notifications.application';
import { NotificationsSettingsService } from './NotificationsSettings.service';
import { CashGapEvaluatorService } from './evaluators/CashGapEvaluator.service';
import { LowBalanceEvaluatorService } from './evaluators/LowBalanceEvaluator.service';
import { OverdueEvaluatorService } from './evaluators/OverdueEvaluator.service';
import { EmailChannelService } from './delivery/EmailChannel.service';
import { NotificationEvaluationProcessor } from './jobs/NotificationEvaluation.processor';
import { NotificationsCron } from './jobs/NotificationsCron';
import { GetNotificationPreferencesService } from './queries/GetNotificationPreferences.service';
import { UpdateNotificationPreferencesService } from './commands/UpdateNotificationPreferences.service';
import { NOTIFICATIONS_QUEUE } from './constants';

@Module({
  imports: [
    TenancyDatabaseModule,
    TenancyModule,
    MailModule,
    FeaturesModule,
    ExchangeRatesModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    BullBoardModule.forFeature({
      name: NOTIFICATIONS_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsApplication,
    NotificationsSettingsService,
    CashGapEvaluatorService,
    LowBalanceEvaluatorService,
    OverdueEvaluatorService,
    EmailChannelService,
    NotificationEvaluationProcessor,
    NotificationsCron,
    GetNotificationPreferencesService,
    UpdateNotificationPreferencesService,
    // Registered directly (PaymentCalendarModule does not export this service).
    GetPaymentCalendarForecastService,
  ],
})
export class NotificationsModule {}
