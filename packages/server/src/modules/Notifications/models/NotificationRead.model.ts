// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class NotificationRead extends TenantBaseModel {
  notificationId!: number;
  userId!: number;
  readAt!: string;

  static get tableName() {
    return 'notification_reads';
  }
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
