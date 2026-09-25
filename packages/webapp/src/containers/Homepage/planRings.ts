import type { HomepagePlan } from './useDashboardOverview';

/** Одно кольцо плана: доля выполнения «с 1-го по сегодня»; `null` — плана нет. */
export interface PlanRing {
  key: 'income' | 'expenses' | 'profit';
  value: number | null;
}

/** Доля факта к плану по сегодня. Без плана — `null`, не «0 %» и не «∞». */
const share = (fact: number, plan: number): number | null => (plan > 0 ? fact / plan : null);

/**
 * Кольца плана на главной (C2, R19 ТЗ-4): доходы, расходы, прибыль — % плана
 * с 1-го числа по сегодня, как в Apple Watch.
 *
 * Прибыль по плану — план доходов минус план расходов на те же дни. Если он
 * не положительный (план в убыток или ноль), процента нет: процент к
 * нулевой или отрицательной базе не показывается нигде в продукте.
 */
export function planRings(plan: Pick<HomepagePlan, 'income' | 'expenses'>): PlanRing[] {
  const income = plan.income;
  const expenses = plan.expenses;
  const rings: PlanRing[] = [];

  // Доля доходов и расходов — та, что посчитал сервер (`completionPercent`):
  // витрина цифры не пересчитывает. `null` у сервера значит «плана на эти
  // дни нет» — и кольцо честно пустое.
  const fromServer = (progress: NonNullable<typeof income>) =>
    progress.completionPercent === null ? null : progress.completionPercent / 100;

  if (income) rings.push({ key: 'income', value: fromServer(income) });
  if (expenses) rings.push({ key: 'expenses', value: fromServer(expenses) });
  // Прибыль — производная тех же чисел сервера; без плана у любой из сторон
  // её процента нет.
  if (income && expenses && income.completionPercent !== null && expenses.completionPercent !== null) {
    rings.push({
      key: 'profit',
      value: share(income.fact - expenses.fact, income.proratedPlan - expenses.proratedPlan),
    });
  }
  return rings;
}
