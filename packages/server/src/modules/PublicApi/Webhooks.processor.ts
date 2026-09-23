// © 2026 Bigfin
import { Scope } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as moment from 'moment';
import { ClsService, UseCls } from 'nestjs-cls';
import { GetPaymentCalendarForecastService } from '@/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  WEBHOOK_CASH_GAP_JOB,
  WEBHOOK_DELIVER_JOB,
  WEBHOOKS_QUEUE,
  WebhookDispatcherService,
} from './WebhookDispatcher.service';

/** Горизонт, на котором ищется кассовый разрыв для вебхука. */
const CASH_GAP_HORIZON_DAYS = 30;

/**
 * Фоновые задачи вебхуков (FT-092 ТЗ-3): доставка с повторами и ежедневная
 * проверка «в прогнозе кассовый разрыв».
 */
@Processor({ name: WEBHOOKS_QUEUE, scope: Scope.REQUEST })
export class WebhooksProcessor extends WorkerHost {
  constructor(
    private readonly cls: ClsService,
    private readonly dispatcher: WebhookDispatcherService,
    private readonly forecast: GetPaymentCalendarForecastService,
    private readonly tenancyContext: TenancyContext,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<any>) {
    this.cls.set('organizationId', job.data.organizationId);
    if (job.data.userId) this.cls.set('userId', job.data.userId);

    if (job.name === WEBHOOK_DELIVER_JOB) {
      return this.dispatcher.deliver(Number(job.data.deliveryId));
    }
    if (job.name === WEBHOOK_CASH_GAP_JOB) {
      const metadata: any = await this.tenancyContext.getTenantMetadata();
      const fromDate = moment().format('YYYY-MM-DD');
      const toDate = moment().add(CASH_GAP_HORIZON_DAYS, 'days').format('YYYY-MM-DD');
      const result: any = await this.forecast.getForecast(metadata?.tenantId, { fromDate, toDate } as any);
      if (!result?.gap) return { gap: false };
      const sent = await this.dispatcher.dispatch('cash_gap.forecasted', {
        date: result.gap.date,
        amount: result.gap.amount,
        daysFromToday: result.gap.daysFromStart,
        horizonDays: CASH_GAP_HORIZON_DAYS,
      });
      return { gap: true, sent };
    }
    return null;
  }
}
