import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Budget extends TenantBaseModel {
  name!: string;
  type!: string;
  fiscalYear!: number;
  periodGranularity!: string;
  activeScenario!: string;
  branchId!: number | null;
  /** Привязка планового остатка: от факта или от плана (FT-056 ТЗ-3). */
  planAnchor!: string;

  /** Колонки, по которым ищет поиск в шапке (Ш3 карты v48). */
  static get searchColumns() {
    return ['name'];
  }

  static get tableName() {
    return 'budgets';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { BudgetLine } = require('./BudgetLine.model');
    return {
      lines: {
        relation: Model.HasManyRelation,
        modelClass: BudgetLine,
        join: { from: 'budgets.id', to: 'budget_lines.budgetId' },
      },
    };
  }
}
