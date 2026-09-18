// © 2026 Bigfin
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import { Webhook } from './models/Webhook.model';
import { WebhookDelivery } from './models/WebhookDelivery.model';
import { WEBHOOK_EVENTS, isKnownEvent } from './utils/webhooks';
import { checkWebhookUrl, WebhookUrlProblem } from './utils/webhookUrl';
import { CreateWebhookDto, EditWebhookDto } from './dtos/PublicApi.dto';

/** Строка списка подписок. Секрет здесь не показывается. */
export interface WebhookRow {
  id: number;
  event: string;
  url: string;
  active: boolean;
  createdAt: Date | null;
}

/** Понятные человеку объяснения отказа по адресу. */
export const WEBHOOK_URL_MESSAGES: Record<WebhookUrlProblem, string> = {
  malformed: 'Это не похоже на адрес. Пример: https://example.com/hook',
  protocol_not_allowed: 'Адрес должен начинаться с http:// или https://',
  private_address:
    'Внутренние адреса запрещены: такой вебхук никуда не дойдёт ' +
    'и может открыть доступ к нашей внутренней сети.',
};

/**
 * Подписки на вебхуки (этап 15 ТЗ).
 *
 * Секрет подписи показывается ОДИН РАЗ при создании — как и токен. Он нужен
 * получателю, чтобы отличать наш вызов от подделки; храниться у нас в
 * читаемом виде он обязан (подписывать-то надо), но отдавать его повторно
 * в список незачем.
 */
@Injectable()
export class WebhooksApplication {
  constructor(
    @Inject(Webhook.name)
    private readonly webhookModel: TenantModelProxy<typeof Webhook>,

    @Inject(WebhookDelivery.name)
    private readonly deliveryModel: TenantModelProxy<typeof WebhookDelivery>,
  ) {}

  /** Какие события бывают — чтобы витрина не выдумывала их сама. */
  public getAvailableEvents() {
    return WEBHOOK_EVENTS;
  }

  public async getWebhooks(): Promise<WebhookRow[]> {
    const webhooks = await this.webhookModel()
      .query()
      .orderBy('createdAt', 'desc');

    return webhooks.map((webhook) => this.toRow(webhook));
  }

  public async createWebhook(
    dto: CreateWebhookDto,
  ): Promise<WebhookRow & { secret: string }> {
    this.assertEvent(dto.event);
    this.assertUrl(dto.url);

    const secret = randomBytes(32).toString('hex');

    const created = await this.webhookModel().query().insertAndFetch({
      event: dto.event,
      url: dto.url,
      secret,
      active: true,
    } as Partial<Webhook>);

    return { ...this.toRow(created), secret };
  }

  public async editWebhook(
    id: number,
    dto: EditWebhookDto,
  ): Promise<WebhookRow> {
    await this.getWebhookOrFail(id);

    if (dto.event !== undefined) this.assertEvent(dto.event);
    if (dto.url !== undefined) this.assertUrl(dto.url);

    const patch: Partial<Webhook> = {};

    if (dto.event !== undefined) patch.event = dto.event;
    if (dto.url !== undefined) patch.url = dto.url;
    if (dto.active !== undefined) patch.active = dto.active;

    const updated = await this.webhookModel()
      .query()
      .patchAndFetchById(id, patch as any);

    return this.toRow(updated);
  }

  public async deleteWebhook(id: number): Promise<void> {
    await this.getWebhookOrFail(id);

    // Доставки уходят вместе с подпиской (ON DELETE CASCADE в миграции):
    // журнал доставок без подписки не отвечает ни на один вопрос.
    await this.webhookModel().query().deleteById(id);
  }

  /**
   * Журнал доставок подписки.
   *
   * Отвечает на вопрос «почему мне не пришло событие?»: видно, сколько раз
   * пытались, каким ответом кончилось и будет ли ещё попытка.
   */
  public async getDeliveries(webhookId: number, limit = 50) {
    await this.getWebhookOrFail(webhookId);

    return this.deliveryModel()
      .query()
      .where('webhookId', webhookId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
  }

  private async getWebhookOrFail(id: number): Promise<Webhook> {
    const webhook = await this.webhookModel().query().findById(id);

    if (!webhook) {
      throw new NotFoundException('Подписка не найдена.');
    }
    return webhook;
  }

  private assertEvent(event: string): void {
    if (!isKnownEvent(event)) {
      // Незнакомое событие нельзя принимать молча: человек подписался бы
      // на опечатку и ждал вызовов вечно.
      throw new BadRequestException(
        `Неизвестное событие: ${event}. Доступные: ${WEBHOOK_EVENTS.join(', ')}`,
      );
    }
  }

  private assertUrl(url: string): void {
    const problem = checkWebhookUrl(url);

    if (problem) {
      throw new BadRequestException(WEBHOOK_URL_MESSAGES[problem]);
    }
  }

  private toRow(webhook: Webhook): WebhookRow {
    return {
      id: webhook.id,
      event: webhook.event,
      url: webhook.url,
      active: Boolean(webhook.active),
      createdAt: (webhook as any).createdAt ?? null,
    };
  }
}
