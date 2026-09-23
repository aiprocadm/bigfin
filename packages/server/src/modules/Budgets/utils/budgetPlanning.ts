// © 2026 Bigfin
/**
 * Бюджет: автозаполнение из истории, лимит расходов и привязка планового
 * остатка (FT-054…FT-056 ТЗ-3). Логика без базы — её держат тесты.
 */

export interface MonthFact {
  /** Месяц истории, 1…12. */
  month: number;
  rows: Array<{ id: number; amount: number }>;
}

/**
 * «Заполнить по прошлому году» (FT-054): факт месяца источника × (1 +
 * коэффициент) → тот же месяц года бюджета, до рубля. Пустые клетки не
 * создаются: ноль в бюджете — это решение человека, а не автомата.
 */
export function autofillBudgetLines(
  facts: MonthFact[],
  fiscalYear: number,
  coefficientPercent: number,
  scenario: string,
) {
  const factor = 1 + Number(coefficientPercent || 0) / 100;
  const lines: Array<{ articleId: number; period: string; scenario: string; plannedAmount: number }> = [];
  for (const { month, rows } of facts) {
    const period = `${fiscalYear}-${String(month).padStart(2, '0')}-01`;
    for (const row of rows) {
      const plannedAmount = Math.round(Number(row.amount) * factor);
      if (plannedAmount === 0) continue;
      lines.push({ articleId: Number(row.id), period, scenario, plannedAmount });
    }
  }
  return lines;
}

export type UsageLevel = 'ok' | 'warning' | 'over' | 'none';

/**
 * «Освоено X из Y» (FT-055): факт расходов против лимита плана. Порог
 * предупреждения — 80 %: к этому моменту ещё можно успеть остановиться.
 */
export function expenseUsage(rows: Array<{ kind?: string; plan: number; fact: number }>) {
  const expenses = rows.filter((row) => row.kind === 'expense');
  const plan = Math.round(expenses.reduce((sum, row) => sum + Math.abs(Number(row.plan)), 0) * 100) / 100;
  const fact = Math.round(expenses.reduce((sum, row) => sum + Math.abs(Number(row.fact)), 0) * 100) / 100;
  if (plan <= 0) return { plan, fact, percent: null as number | null, level: 'none' as UsageLevel };
  const percent = Math.round((fact / plan) * 1000) / 10;
  const level: UsageLevel = percent > 100 ? 'over' : percent >= 80 ? 'warning' : 'ok';
  return { plan, fact, percent, level };
}

export type PlanAnchor = 'fact' | 'plan';
export const PLAN_ANCHORS: PlanAnchor[] = ['fact', 'plan'];

export interface CashPlanMonth {
  period: string;
  planNet: number;
  /** Фактический остаток на конец месяца; null — месяц ещё не прожит. */
  factClosing: number | null;
}

/**
 * «Денег на начало (план)» (FT-056). От факта (как у конкурента): начало
 * месяца — фактический конец предыдущего. От плана: начало — плановый конец
 * предыдущего, то есть траектория «если план сбудется». Где факта ещё нет
 * (будущее), обе привязки идут по плану. Факт от выбора не меняется.
 */
export function cashPlanChain(openingFact: number, months: CashPlanMonth[], anchor: PlanAnchor) {
  const round = (value: number) => Math.round(value * 100) / 100;
  let previousPlanClosing = openingFact;
  let previousFactClosing: number | null = openingFact;
  return months.map((month) => {
    const openingPlan =
      anchor === 'fact' && previousFactClosing !== null ? previousFactClosing : previousPlanClosing;
    const closingPlan = openingPlan + month.planNet;
    previousPlanClosing = closingPlan;
    previousFactClosing = month.factClosing;
    return {
      period: month.period,
      openingPlan: round(openingPlan),
      planNet: round(month.planNet),
      closingPlan: round(closingPlan),
      factClosing: month.factClosing === null ? null : round(month.factClosing),
    };
  });
}
