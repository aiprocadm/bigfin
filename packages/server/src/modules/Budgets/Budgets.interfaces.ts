/** Одна ячейка сетки бюджета. */
export interface BudgetCell {
  articleId: number;
  period: string; // YYYY-MM-01
  scenario: string;
  plannedAmount: number;
}

/** Строка план-факта по статье. */
export interface PlanFactRow {
  articleId: number;
  name: string;
  kind: string;
  plan: number;
  fact: number;
  varianceAbs: number; // факт − план
  variancePct: number | null; // null если план = 0
}

export interface PlanFactResponse {
  budgetId: number;
  type: string;
  scenario: string;
  period: string;
  rows: PlanFactRow[];
}
