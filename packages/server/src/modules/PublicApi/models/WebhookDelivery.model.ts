// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Запись журнала доставок (этап 15 ТЗ).
 *
 * Без журнала на вопрос «почему мне не пришло событие?» ответить нечем:
 * вызов уходит наружу и нигде не оставляет следа.
 */
export class WebhookDelivery extends TenantBaseModel {
  public webhookId: number;
  public event: string;
  public payload: string;
  public attempts: number;
  public statusCode: number | null;
  public error: string | null;
  /** Пусто — попыток больше не будет. */
  public nextAttemptAt: Date | null;
  public deliveredAt: Date | null;

  static get tableName() {
    return 'webhook_deliveries';
  }

  static get timestamps() {
    return true;
  }
}
