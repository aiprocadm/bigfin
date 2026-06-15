// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class PayrollRunLine extends TenantBaseModel {
  runId!: number;
  employeeId!: number;
  employmentType!: string;
  baseAmount!: number;
  bonusAmount!: number;
  deductionAmount!: number;
  ndflAmount!: number;
  contributionsAmount!: number;
  netAmount!: number;
  totalCost!: number;

  static get tableName() {
    return 'payroll_run_lines';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { Employee } = require('./Employee.model');

    return {
      employee: {
        relation: Model.BelongsToOneRelation,
        modelClass: Employee,
        join: {
          from: 'payroll_run_lines.employeeId',
          to: 'employees.id',
        },
      },
    };
  }
}
