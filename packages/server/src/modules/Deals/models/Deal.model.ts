// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Deal extends TenantBaseModel {
  name!: string;
  contactId!: number | null;
  deadline!: string | null;
  costEstimate!: number | null;
  status!: string;

  /** Reuses the dormant base "projects" table as the Deal entity. */
  static get tableName() {
    return 'projects';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      filterByStatus(query, status: string) {
        query.where('status', status);
      },
    };
  }
}
