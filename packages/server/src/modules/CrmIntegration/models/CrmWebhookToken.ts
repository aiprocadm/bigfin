import { BaseModel } from '@/models/Model';

/**
 * Системная запись: токен входящего webhook собственной CRM → тенант (⑯c).
 * Живёт в системной схеме (как `plaid_items`), а не в тенантной.
 */
export class CrmWebhookToken extends BaseModel {
  tenantId: number;
  token: string;

  static get tableName() {
    return 'crm_webhook_tokens';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
