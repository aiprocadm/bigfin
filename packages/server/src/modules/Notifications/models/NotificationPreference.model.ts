// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class NotificationPreference extends TenantBaseModel {
  eventType!: string;
  enabled!: boolean;
  channels!: string;
  threshold!: string | null;

  static get tableName() {
    return 'notification_preferences';
  }
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
