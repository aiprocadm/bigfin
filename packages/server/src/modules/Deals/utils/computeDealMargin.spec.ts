import { computeDealMargin } from './computeDealMargin';

describe('computeDealMargin', () => {
  it('revenue − costs = profit; margin = profit/revenue (top-level rows only)', () => {
    const rows = [
      { id: 1, name: 'Доходы', kind: 'income', parentId: null, amount: 600 },
      { id: 2, name: 'Расходы', kind: 'expense', parentId: null, amount: 390 },
      { id: 3, name: 'Выручка', kind: 'income', parentId: 1, amount: 600 }, // потомок — игнор
    ];

    expect(computeDealMargin(rows)).toEqual({
      revenue: 600,
      costs: 390,
      profit: 210,
      margin: 210 / 600,
    });
  });

  it('margin is 0 when revenue is 0 (no division by zero)', () => {
    const rows = [
      { id: 2, name: 'Расходы', kind: 'expense', parentId: null, amount: 100 },
    ];

    expect(computeDealMargin(rows)).toEqual({
      revenue: 0,
      costs: 100,
      profit: -100,
      margin: 0,
    });
  });
});
