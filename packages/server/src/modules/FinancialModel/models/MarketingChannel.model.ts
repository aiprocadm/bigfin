// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/** Канал привлечения клиентов (Яндекс, Google, соцсети…). */
export class MarketingChannel extends TenantBaseModel {
  name!: string;
  active!: boolean;

  static get tableName() {
    return 'marketing_channels';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
