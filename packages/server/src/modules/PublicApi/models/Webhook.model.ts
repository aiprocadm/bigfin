// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Подписка на вебхук (этап 15 ТЗ).
 *
 * В отличие от токена, подписка принадлежит одной организации: её адрес, её
 * события, её секрет. Поэтому — тенантная схема.
 */
export class Webhook extends TenantBaseModel {
  public event: string;
  public url: string;
  /** Секрет подписи: по нему получатель отличает наш вызов от подделки. */
  public secret: string;
  public active: boolean;

  static get tableName() {
    return 'webhooks';
  }

  static get timestamps() {
    return true;
  }
}
