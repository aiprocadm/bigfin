// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Связь сущности 1С с сущностью Bigfin — идемпотентность импорта CommerceML
 * (⑩): повторная загрузка того же файла обновляет карточки, а не задваивает.
 * Таблица `onec_import_links`, unique(entity_type, external_id).
 */
export class OnecImportLink extends TenantBaseModel {
  /** 'item' | 'contact' */
  entityType!: string;
  /** `<Ид>` из выгрузки 1С. */
  externalId!: string;
  entityId!: number;

  static get tableName() {
    return 'onec_import_links';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
