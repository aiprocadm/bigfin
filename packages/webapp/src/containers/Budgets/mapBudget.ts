/**
 * Разбор ответов модуля бюджетов (⑤).
 *
 * Сервер отдаёт поля в snake_case (`fiscal_year`, `planned_amount`,
 * `variance_abs`), а страницы читали их в camelCase. Последствия были не
 * косметические: сетка не показывала сохранённые суммы, год бюджета
 * подменялся текущим, а вкладка «План-факт» роняла приложение, пытаясь
 * отформатировать `undefined`.
 */
export interface BudgetLine {
  id: number;
  articleId: number;
  period: string;
  scenario: string;
  plannedAmount: number;
}

export interface Budget {
  id: number;
  name: string;
  type: string;
  fiscalYear: number | null;
  periodGranularity: string;
  activeScenario: string;
  lines: BudgetLine[];
}

export interface PlanFactRow {
  articleId: number;
  name: string;
  kind: string;
  plan: number;
  fact: number;
  varianceAbs: number;
  variancePct: number | null;
}

export interface PlanFact {
  type: string;
  scenario: string;
  period: string;
  rows: PlanFactRow[];
}

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pick = (raw: any, snake: string, camel: string): unknown =>
  raw?.[snake] ?? raw?.[camel];

export const mapBudgetLine = (raw: any): BudgetLine => ({
  id: num(raw?.id),
  articleId: num(pick(raw, 'article_id', 'articleId')),
  // Дата приходит как «2026-01-01T00:00:00.000Z» — в сетке нужен только день.
  period: String(raw?.period ?? '').slice(0, 10),
  scenario: raw?.scenario ?? 'realistic',
  plannedAmount: num(pick(raw, 'planned_amount', 'plannedAmount')),
});

export const mapBudget = (raw: any): Budget => ({
  id: num(raw?.id),
  name: raw?.name ?? '',
  type: raw?.type ?? '',
  fiscalYear: (() => {
    const year = pick(raw, 'fiscal_year', 'fiscalYear');
    return year == null ? null : num(year, null as any);
  })(),
  periodGranularity:
    (pick(raw, 'period_granularity', 'periodGranularity') as string) ?? 'month',
  activeScenario:
    (pick(raw, 'active_scenario', 'activeScenario') as string) ?? 'realistic',
  lines: (raw?.lines ?? []).map(mapBudgetLine),
});

export const mapBudgets = (raw: any): Budget[] =>
  (Array.isArray(raw) ? raw : (raw?.data ?? [])).map(mapBudget);

export const mapPlanFactRow = (raw: any): PlanFactRow => {
  const pct = pick(raw, 'variance_pct', 'variancePct');

  return {
    articleId: num(pick(raw, 'article_id', 'articleId')),
    name: raw?.name ?? '',
    kind: raw?.kind ?? '',
    plan: num(raw?.plan),
    fact: num(raw?.fact),
    varianceAbs: num(pick(raw, 'variance_abs', 'varianceAbs')),
    // Процент неприменим, когда плана нет, — так и отдаём пустым.
    variancePct: pct == null ? null : num(pct),
  };
};

export const mapPlanFact = (raw: any): PlanFact => ({
  type: raw?.type ?? '',
  scenario: raw?.scenario ?? '',
  period: raw?.period ?? '',
  rows: (raw?.rows ?? []).map(mapPlanFactRow),
});
