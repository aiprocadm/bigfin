import { describe, it, expect } from 'vitest';
import {
  mapBudget,
  mapBudgets,
  mapBudgetLine,
  mapPlanFact,
} from './mapBudget';

/** Ответ сервера как есть — snake_case. */
const budgetResponse = {
  id: 1,
  name: 'Бюджет доходов и расходов 2026',
  type: 'bdir',
  fiscal_year: 2026,
  period_granularity: 'month',
  active_scenario: 'optimistic',
  lines: [
    {
      id: 1,
      budget_id: 1,
      article_id: 2,
      period: '2026-01-01T00:00:00.000Z',
      scenario: 'realistic',
      planned_amount: 333000,
    },
  ],
};

const planFactResponse = {
  type: 'bdir',
  scenario: 'realistic',
  period: '2026-01-01..2026-12-31',
  rows: [
    {
      name: 'Выручка',
      kind: 'income',
      plan: 583000,
      fact: 120000,
      article_id: 2,
      variance_abs: -463000,
      variance_pct: -79.4,
    },
    {
      name: 'Прочее',
      kind: 'expense',
      plan: 0,
      fact: 0,
      article_id: 9,
      variance_abs: 0,
      variance_pct: null,
    },
  ],
};

describe('разбор бюджета', () => {
  it('читает год бюджета — иначе план-факт считался бы за текущий', () => {
    expect(mapBudget(budgetResponse).fiscalYear).toBe(2026);
  });

  it('читает активный сценарий бюджета', () => {
    expect(mapBudget(budgetResponse).activeScenario).toBe('optimistic');
  });

  it('без сценария в ответе подставляет реалистичный', () => {
    expect(mapBudget({ id: 1 }).activeScenario).toBe('realistic');
  });

  it('строки сетки получают статью и сумму — без них сетка пустая', () => {
    const [line] = mapBudget(budgetResponse).lines;

    expect(line).toEqual({
      id: 1,
      articleId: 2,
      period: '2026-01-01',
      scenario: 'realistic',
      plannedAmount: 333000,
    });
  });

  it('дата строки обрезается до дня — по нему сетка ищет ячейку', () => {
    const line = mapBudgetLine({ period: '2026-03-01T00:00:00.000Z' });

    expect(line.period).toBe('2026-03-01');
  });

  it('понимает и camelCase, если сервер отдаст его', () => {
    const budget = mapBudget({
      id: 2,
      fiscalYear: 2027,
      activeScenario: 'pessimistic',
      lines: [{ articleId: 5, plannedAmount: 100, period: '2027-01-01' }],
    });

    expect(budget.fiscalYear).toBe(2027);
    expect(budget.activeScenario).toBe('pessimistic');
    expect(budget.lines[0].plannedAmount).toBe(100);
  });

  it('список бюджетов разбирается целиком', () => {
    expect(mapBudgets([budgetResponse])).toHaveLength(1);
    expect(mapBudgets({ data: [budgetResponse] })[0].fiscalYear).toBe(2026);
  });

  it('пустой ответ не роняет страницу', () => {
    expect(mapBudget(undefined).lines).toEqual([]);
    expect(mapBudgets(undefined)).toEqual([]);
  });
});

describe('разбор плана-факта', () => {
  it('читает отклонение — из-за него страница падала', () => {
    const [row] = mapPlanFact(planFactResponse).rows;

    expect(row.varianceAbs).toBe(-463000);
    expect(row.variancePct).toBe(-79.4);
  });

  it('отклонение всегда число, даже если сервер поле не прислал', () => {
    const [row] = mapPlanFact({ rows: [{ name: 'Аренда', plan: 10 }] }).rows;

    // Именно undefined здесь ронял форматирование суммы.
    expect(row.varianceAbs).toBe(0);
    expect(typeof row.varianceAbs).toBe('number');
  });

  it('пустой процент отклонения остаётся пустым, а не нулём', () => {
    const rows = mapPlanFact(planFactResponse).rows;

    // Ноль процентов и «посчитать нельзя» — разные вещи.
    expect(rows[1].variancePct).toBeNull();
  });

  it('строки получают статью — она служит ключом строки таблицы', () => {
    const rows = mapPlanFact(planFactResponse).rows;

    expect(rows.map((r) => r.articleId)).toEqual([2, 9]);
  });

  it('план и факт приходят числами, даже если сервер отдал строки', () => {
    const [row] = mapPlanFact({
      rows: [{ plan: '583000', fact: '120000', variance_abs: '-463000' }],
    }).rows;

    expect(row.plan).toBe(583000);
    expect(row.fact).toBe(120000);
    expect(row.varianceAbs).toBe(-463000);
  });

  it('пустой ответ даёт пустую таблицу', () => {
    expect(mapPlanFact(undefined).rows).toEqual([]);
  });
});
