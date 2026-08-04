// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Связь сущности МойСклад с карточкой Bigfin — идемпотентность импорта (㉛):
 * повторный импорт обновляет карточки, а не создаёт дубликаты.
 * Таблица `moysklad_import_links`, unique(entity_type, external_id).
 */
export class MoyskladImportLink extends TenantBaseModel {
  /** Пока только 'item'; тип оставлен на вырост. */
  entityType!: string;
  externalId!: string;
  entityId!: number;

  static get tableName() {
    return 'moysklad_import_links';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
