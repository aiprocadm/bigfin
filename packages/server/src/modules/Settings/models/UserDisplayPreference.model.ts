// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Личная настройка отображения (FIN-026 ТЗ-2).
 *
 * Хранится «ключ — значение»: набор настроек будет расти, и миграция на
 * каждую галочку — плохой обмен.
 */
export class UserDisplayPreference extends TenantBaseModel {
  userId!: number;
  key!: string;
  value!: any;

  static get tableName() {
    return 'user_display_preferences';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
