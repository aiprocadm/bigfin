// © 2026 Bigfin
import { autofillBudgetLines, cashPlanChain, expenseUsage } from './budgetPlanning';

describe('бюджет: автозаполнение, лимит, привязка остатка', () => {
  it('AC FT-054: факт 2025 × 1,1 до рубля, тот же месяц года бюджета', () => {
    const lines = autofillBudgetLines(
      [
        { month: 1, rows: [{ id: 5, amount: 100_000.4 }, { id: 2, amount: 0 }] },
        { month: 12, rows: [{ id: 5, amount: 33_333 }] },
      ],
      2026,
      10,
      'realistic',
    );
    expect(lines).toEqual([
      { articleId: 5, period: '2026-01-01', scenario: 'realistic', plannedAmount: 110_000 },
      { articleId: 5, period: '2026-12-01', scenario: 'realistic', plannedAmount: 36_666 },
    ]);
  });

  it('FT-055: освоено X из Y, цвет по порогу', () => {
    const rows = (fact: number) => [
      { kind: 'expense', plan: 100_000, fact },
      { kind: 'income', plan: 500_000, fact: 1 },
    ];
    expect(expenseUsage(rows(50_000))).toEqual({ plan: 100_000, fact: 50_000, percent: 50, level: 'ok' });
    expect(expenseUsage(rows(85_000)).level).toBe('warning');
    expect(expenseUsage(rows(120_000))).toMatchObject({ percent: 120, level: 'over' });
    expect(expenseUsage([{ kind: 'income', plan: 1, fact: 1 }])).toMatchObject({ percent: null, level: 'none' });
  });

  it('AC FT-056: привязка меняет только плановое начало и производные, факт не меняется', () => {
    const months = [
      { period: '2026-01-01', planNet: 100, factClosing: 1_050 },
      { period: '2026-02-01', planNet: 100, factClosing: 1_020 },
      { period: '2026-03-01', planNet: 100, factClosing: null },
    ];
    const byFact = cashPlanChain(1_000, months, 'fact');
    const byPlan = cashPlanChain(1_000, months, 'plan');
    expect(byFact.map((m) => m.openingPlan)).toEqual([1_000, 1_050, 1_020]);
    expect(byPlan.map((m) => m.openingPlan)).toEqual([1_000, 1_100, 1_200]);
    expect(byPlan.map((m) => m.closingPlan)).toEqual([1_100, 1_200, 1_300]);
    expect(byFact.map((m) => m.factClosing)).toEqual(byPlan.map((m) => m.factClosing));
    expect(byFact.map((m) => m.planNet)).toEqual(byPlan.map((m) => m.planNet));
  });
});
