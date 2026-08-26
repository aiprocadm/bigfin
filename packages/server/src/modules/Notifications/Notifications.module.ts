// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { MailModule } from '@/modules/Mail/Mail.module';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { DashboardModule } from '../Dashboard/Dashboard.module';
import { ExchangeRatesModule } from '@/modules/ExchangeRates/ExchangeRates.module';
import { GetPaymentCalendarForecastService } from '@/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service';
import { NotificationsController } from './Notifications.controller';
import { NotificationsApplication } from './Notifications.application';
import { NotificationsSettingsService } from './NotificationsSettings.service';
import { NotificationTextsService } from './NotificationTexts.service';
import { CashGapEvaluatorService } from './evaluators/CashGapEvaluator.service';
import { LowBalanceEvaluatorService } from './evaluators/LowBalanceEvaluator.service';
import { TaxDueEvaluatorService } from './evaluators/TaxDueEvaluator.service';
import { OverdueEvaluatorService } from './evaluators/OverdueEvaluator.service';
import { EmailChannelService } from './delivery/EmailChannel.service';
import { TelegramApiService } from './delivery/TelegramApi.service';
import { TelegramChannelService } from './delivery/TelegramChannel.service';
import { ConnectTelegramService } from './commands/ConnectTelegram.service';
import { NotificationEvaluationProcessor } from './jobs/NotificationEvaluation.processor';
import { NotificationsCron } from './jobs/NotificationsCron';
import { TelegramEntriesCron } from './jobs/TelegramEntriesCron';
import { TelegramEntriesProcessor } from './jobs/TelegramEntriesProcessor';
import { PullTelegramEntriesService } from './commands/PullTelegramEntries.service';
import { BankingCategorizeModule } from '../BankingCategorize/BankingCategorize.module';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { GetNotificationPreferencesService } from './queries/GetNotificationPreferences.service';
import { UpdateNotificationPreferencesService } from './commands/UpdateNotificationPreferences.service';
import { InAppNotificationsService } from './queries/InAppNotifications.service';
import { NOTIFICATIONS_QUEUE, TELEGRAM_ENTRIES_QUEUE } from './constants';

@Module({
  imports: [
    TenancyDatabaseModule,
    TenancyModule,
    // Оценка налога для правила «скоро платить налог» (Н4 карты v22):
    // считаем ею же, что и плитка на главной, второго способа быть не должно.
    DashboardModule,
    MailModule,
    FeaturesModule,
    ExchangeRatesModule,
    BankingCategorizeModule,
    BankingTransactionsModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    BullModule.registerQueue({ name: TELEGRAM_ENTRIES_QUEUE }),
    BullBoardModule.forFeature({
      name: NOTIFICATIONS_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: TELEGRAM_ENTRIES_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsApplication,
    NotificationsSettingsService,
    NotificationTextsService,
    CashGapEvaluatorService,
    LowBalanceEvaluatorService,
    TaxDueEvaluatorService,
    OverdueEvaluatorService,
    EmailChannelService,
    TelegramApiService,
    TelegramChannelService,
    ConnectTelegramService,
    NotificationEvaluationProcessor,
    NotificationsCron,
    TelegramEntriesCron,
    TelegramEntriesProcessor,
    PullTelegramEntriesService,
    GetNotificationPreferencesService,
    UpdateNotificationPreferencesService,
    InAppNotificationsService,
    // Registered directly (PaymentCalendarModule does not export this service).
    GetPaymentCalendarForecastService,
  ],
})
export class NotificationsModule {}
