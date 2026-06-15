// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Notification extends TenantBaseModel {
  eventType!: string;
  title!: string;
  body!: string;
  dedupKey!: string;
  payload!: string | null;
  firedAt!: string;
  readAt!: string | null;
  userId!: number | null;
  channelsSent!: string | null;

  static get tableName() {
    return 'notifications';
  }
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
