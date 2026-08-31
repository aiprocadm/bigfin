// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Deal extends TenantBaseModel {
  name!: string;
  contactId!: number | null;
  managerId!: number | null;
  deadline!: string | null;
  costEstimate!: number | null;
  status!: string;

  /** Колонки, по которым ищет поиск в шапке (Р2 карты v43). */
  static get searchColumns() {
    return ['name'];
  }

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
