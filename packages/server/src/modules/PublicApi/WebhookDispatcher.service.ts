// © 2026 Bigfin
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Knex } from 'knex';
import * as moment from 'moment';
import { ClsService } from 'nestjs-cls';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { runAfterTransaction } from '@/modules/Tenancy/TenancyDB/TransactionsHooks';
import { Webhook } from './models/Webhook.model';
import { WebhookDelivery } from './models/WebhookDelivery.model';
import { attemptOutcome, deliveryHeaders } from './utils/webhookDelivery';
import { isAllowedWebhookUrl } from './utils/webhookUrl';

export const WEBHOOKS_QUEUE = 'webhooks-delivery-queue';
export const WEBHOOK_DELIVER_JOB = 'deliver';
export const WEBHOOK_CASH_GAP_JOB = 'cash-gap-scan';

/** Сколько ждать ответа подписчика: зависший чужой сервер не держит очередь. */
const DELIVERY_TIMEOUT_MS = 10_000;
const mysqlNow = () => moment().format('YYYY-MM-DD HH:mm:ss');

/**
 * Отправка вебхуков (FT-092 ТЗ-3). До этапа 39 подписки, подпись и правила
 * повторов были, а отправки не было: подписчики не получали НИЧЕГО.
 *
 * Событие → запись в журнале доставок (в транзакции события) → задача в
 * очереди ПОСЛЕ фиксации: иначе подписчик узнал бы об операции, которую
 * откатили. Каждая попытка — в журнале: код ответа, ошибка, число попыток.
 */
@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    @InjectQueue(WEBHOOKS_QUEUE) private readonly queue: Queue,
    private readonly cls: ClsService,
    @Inject(Webhook.name)
    private readonly webhookModel: TenantModelProxy<typeof Webhook>,
    @Inject(WebhookDelivery.name)
    private readonly deliveryModel: TenantModelProxy<typeof WebhookDelivery>,
  ) {}

  public async dispatch(event: string, data: Record<string, unknown>, trx?: Knex.Transaction) {
    const webhooks: any[] = await this.webhookModel().query(trx).where('event', event).where('active', true);
    if (webhooks.length === 0) return 0;
    const organizationId = this.cls.get('organizationId');
    // Время события в теле — ISO-строкой: это договор с подписчиком, а не
    // запись в базу.
    const occurredAt = new Date().toISOString();
    const payload = JSON.stringify({ event, occurredAt, organizationId, data });
    const ids: number[] = [];
    for (const webhook of webhooks) {
      const delivery: any = await this.deliveryModel()
        .query(trx)
        .insert({ webhookId: webhook.id, event, payload, attempts: 0, nextAttemptAt: mysqlNow() } as any);
      ids.push(Number(delivery.id));
    }
    const enqueue = () =>
      Promise.all(
        ids.map((deliveryId) =>
          this.queue.add(
            WEBHOOK_DELIVER_JOB,
            { deliveryId, organizationId, userId: this.cls.get('userId') ?? null },
            { removeOnComplete: true, removeOnFail: 100 },
          ),
        ),
      );
    if (trx) runAfterTransaction(trx, enqueue);
    else await enqueue();
    return ids.length;
  }

  /** Одна попытка доставки; повтор — новой задачей с задержкой. */
  public async deliver(deliveryId: number) {
    const delivery: any = await this.deliveryModel().query().findById(deliveryId);
    if (!delivery || delivery.deliveredAt) return { skipped: true };
    const webhook: any = await this.webhookModel().query().findById(delivery.webhookId);

    let statusCode: number | null = null;
    let error: string | null = null;
    if (!webhook || !webhook.active) {
      error = 'Подписка удалена или выключена';
    } else if (!isAllowedWebhookUrl(webhook.url)) {
      // Адрес проверяется и при отправке: подписку могли завести до правил.
      error = 'Адрес подписки запрещён';
    } else {
      const now = Math.floor(Date.now() / 1000);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
      try {
        const response = await (globalThis as any).fetch(webhook.url, {
          method: 'POST',
          headers: deliveryHeaders(delivery.event, delivery.payload, webhook.secret, now, deliveryId),
          body: delivery.payload,
          signal: controller.signal,
          redirect: 'manual',
        });
        statusCode = Number(response.status);
      } catch (caught: any) {
        error = caught?.name === 'AbortError' ? 'Подписчик не ответил за 10 секунд' : String(caught?.message ?? caught);
      } finally {
        clearTimeout(timer);
      }
    }

    // Выключенную подписку не повторяем: ответа не будет никогда.
    const outcome = attemptOutcome(Number(delivery.attempts ?? 0), statusCode, error);
    const final = !webhook || !webhook.active || error === 'Адрес подписки запрещён';
    const retry = final ? null : outcome.retryInSeconds;
    await this.deliveryModel()
      .query()
      .findById(deliveryId)
      .patch({
        attempts: outcome.attempts,
        statusCode: outcome.statusCode,
        error: outcome.error,
        deliveredAt: outcome.delivered ? mysqlNow() : null,
        nextAttemptAt: retry ? moment().add(retry, 'seconds').format('YYYY-MM-DD HH:mm:ss') : null,
      } as any);
    if (retry) {
      await this.queue.add(
        WEBHOOK_DELIVER_JOB,
        { deliveryId, organizationId: this.cls.get('organizationId'), userId: this.cls.get('userId') ?? null },
        { delay: retry * 1000, removeOnComplete: true, removeOnFail: 100 },
      );
    }
    if (!outcome.delivered) this.logger.warn(`Вебхук ${deliveryId}: ${outcome.error}; повтор через ${retry ?? '—'} с`);
    return outcome;
  }
}
