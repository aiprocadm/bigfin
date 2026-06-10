// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class EmployeeKpiTarget extends TenantBaseModel {
  employeeId!: number;
  periodMonth!: string;
  metric!: string;
  targetAmount!: number;
  bonusRate!: number;
  onlyIfAchieved!: boolean;
  note!: string | null;

  static get tableName() {
    return 'employee_kpi_targets';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      filterByYear(query, year: number) {
        query
          .where('periodMonth', '>=', `${year}-01-01`)
          .where('periodMonth', '<=', `${year}-12-31`);
      },
    };
  }

  static get relationMappings() {
    const { Employee } = require('@/modules/Payroll/models/Employee.model');

    return {
      employee: {
        relation: Model.BelongsToOneRelation,
        modelClass: Employee,
        join: {
          from: 'employee_kpi_targets.employeeId',
          to: 'employees.id',
        },
      },
    };
  }
}
