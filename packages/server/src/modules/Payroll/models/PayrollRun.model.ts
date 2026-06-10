// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class PayrollRun extends TenantBaseModel {
  periodMonth!: string;
  payDate!: string;
  status!: string;
  note!: string | null;

  static get tableName() {
    return 'payroll_runs';
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
      approvedOnly(query) {
        query.where('status', 'approved');
      },
    };
  }

  static get relationMappings() {
    const {
      PayrollRunLine,
    } = require('@/modules/Payroll/models/PayrollRunLine.model');

    return {
      lines: {
        relation: Model.HasManyRelation,
        modelClass: PayrollRunLine,
        join: {
          from: 'payroll_runs.id',
          to: 'payroll_run_lines.runId',
        },
      },
    };
  }
}
