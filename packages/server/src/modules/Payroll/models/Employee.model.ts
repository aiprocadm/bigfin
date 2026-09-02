// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Employee extends TenantBaseModel {
  fullName!: string;
  position!: string | null;
  employmentType!: string;
  defaultSalary!: number;
  active!: boolean;
  note!: string | null;

  /** Колонки, по которым ищет поиск в шапке (Ш2 карты v48). */
  static get searchColumns() {
    return ['fullName'];
  }

  static get tableName() {
    return 'employees';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      activeOnly(query) {
        query.where('active', true);
      },
    };
  }
}
