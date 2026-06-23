// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Связь импортированной из CRM сущности с сущностью Bigfin — обеспечивает
 * идемпотентность синхронизации (повторный импорт не задваивает).
 * Таблица `crm_sync_links`, unique(connector_key, external_id, entity_type).
 */
export class CrmSyncLink extends TenantBaseModel {
  connectorKey!: string;
  externalId!: string;
  /** 'contact' | 'deal' */
  entityType!: string;
  /** id связанной сущности Bigfin (customer / deal). */
  entityId!: number;

  static get tableName() {
    return 'crm_sync_links';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
