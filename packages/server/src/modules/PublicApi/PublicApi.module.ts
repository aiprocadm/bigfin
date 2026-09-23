// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { PaymentCalendarModule } from '@/modules/PaymentCalendar/PaymentCalendar.module';

import { ApiTokensApplication } from './ApiTokens.application';
import { WebhooksApplication } from './Webhooks.application';
import { PublicApiController } from './PublicApi.controller';
import { WebhookDispatcherService, WEBHOOKS_QUEUE } from './WebhookDispatcher.service';
import { WebhookEventsSubscriber } from './subscribers/WebhookEvents.subscriber';
import { WebhooksProcessor } from './Webhooks.processor';
import { WebhookCashGapCron } from './WebhookCashGap.cron';

/**
 * Публичный API и вебхуки (этап 15 ТЗ, FT-091/FT-092 ТЗ-3).
 *
 * `TenancyContext` — в providers: токены лежат в системной схеме, и без него
 * не узнать, какой организации принадлежит выпускаемый токен (это стережёт
 * `tenancyModuleImports.spec.ts`).
 *
 * Отправка вебхуков — очередью: доставка с повторами до 8 минут не должна
 * держать запрос, породивший событие.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: WEBHOOKS_QUEUE }),
    // Прогноз денег — для вебхука «кассовый разрыв».
    PaymentCalendarModule,
  ],
  controllers: [PublicApiController],
  providers: [
    ApiTokensApplication,
    WebhooksApplication,
    TenancyContext,
    WebhookDispatcherService,
    WebhookEventsSubscriber,
    WebhooksProcessor,
    WebhookCashGapCron,
  ],
  exports: [ApiTokensApplication, WebhooksApplication, WebhookDispatcherService],
})
export class PublicApiModule {}
