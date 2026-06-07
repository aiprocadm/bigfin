// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class DealStage extends TenantBaseModel {
  dealId!: number;
  name!: string;
  sortOrder!: number;
  plannedRevenue!: number;
  plannedCost!: number;
  status!: string;
  closedDate!: string | null;

  static get tableName() {
    return 'deal_stages';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      forDeal(query, dealId: number) {
        query.where('dealId', dealId);
      },
      closed(query) {
        query.where('status', 'closed');
      },
    };
  }
}
