import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class BudgetLine extends TenantBaseModel {
  budgetId!: number;
  articleId!: number;
  period!: Date | string;
  scenario!: string;
  plannedAmount!: number;

  static get tableName() {
    return 'budget_lines';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      forBudgetScenario(query, budgetId: number, scenario: string) {
        query.where('budgetId', budgetId).where('scenario', scenario);
      },
    };
  }
}
