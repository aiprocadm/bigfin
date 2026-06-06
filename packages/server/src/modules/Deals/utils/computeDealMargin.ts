// © 2026 Bigfin
export interface ArticleRow {
  id: number;
  name: string;
  kind: string;
  amount: number;
  parentId?: number | null;
}

export interface DealMargin {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

/**
 * Считает выручку/расходы/прибыль/маржу по строкам свёртки статей
 * (доход и расход — оба положительные магнитуды). Берём только корневые
 * строки (`parentId == null`): их amount уже содержит сумму поддерева
 * (см. rollupAmountsToAncestors), поэтому суммирование потомков задвоило бы.
 */
export function computeDealMargin(rows: ArticleRow[]): DealMargin {
  const tops = rows.filter((r) => r.parentId == null);
  const sumKind = (kind: string) =>
    tops
      .filter((r) => r.kind === kind)
      .reduce((s, r) => s + (r.amount ?? 0), 0);

  const revenue = sumKind('income');
  const costs = sumKind('expense');
  const profit = revenue - costs;
  const margin = revenue > 0 ? profit / revenue : 0;

  return { revenue, costs, profit, margin };
}
