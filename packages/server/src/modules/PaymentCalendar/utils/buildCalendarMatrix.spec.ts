// © 2026 Bigfin
import { buildCalendarMatrix, matrixPeriods } from './buildCalendarMatrix';

/** FT-050 ТЗ-3: матрица план/факт с накопительным плановым остатком. */
describe('платёжный календарь: матрица план/факт', () => {
  const october = matrixPeriods('2026-10-01', '2026-11-30', 'month');

  it('AC: 1 000 000 и плановые списания 700 000 (10.10) и 500 000 (12.10) — конец октября −200 000, разрыв', () => {
    const matrix = buildCalendarMatrix({
      periods: october,
      openingByAccount: new Map([[1000, 1_000_000]]),
      plan: [
        { date: '2026-10-10', amount: -700_000, groupKey: '5', accountId: 1000 },
        { date: '2026-10-12', amount: -500_000, groupKey: '5', accountId: 1000 },
      ],
      fact: [],
    });
    expect(matrix.columns[0].plan).toEqual({
      opening: 1_000_000,
      inflow: 0,
      outflow: 1_200_000,
      change: -1_200_000,
      closing: -200_000,
    });
    expect(matrix.columns[0].gap).toBe(true);
    // Накопительный: ноябрь начинается там, где закончился октябрь.
    expect(matrix.columns[1].plan.opening).toBe(-200_000);
    expect(matrix.columns[1].gap).toBe(true);
  });

  it('факт и план считаются порознь, и оба сцеплены по колонкам', () => {
    const matrix = buildCalendarMatrix({
      periods: october,
      openingByAccount: new Map([
        [1000, 100],
        [1003, 50],
      ]),
      plan: [{ date: '2026-10-05', amount: 30, groupKey: '2', accountId: 1000 }],
      fact: [
        { date: '2026-10-06', amount: 40, groupKey: '2', accountId: 1000 },
        { date: '2026-11-02', amount: -10, groupKey: '5', accountId: 1003 },
      ],
    });
    expect(matrix.columns.map((c) => [c.plan.closing, c.fact.closing])).toEqual([
      [180, 190],
      [180, 180],
    ]);
    expect(matrix.columns[1].fact.opening).toBe(matrix.columns[0].fact.closing);
    // Раскрытие по счетам: остатки счетов складываются в общий.
    expect(matrix.accounts.map((a) => a.cells[1].factClosing)).toEqual([140, 40]);
    expect(matrix.inflowGroups).toEqual([{ key: '2', cells: [{ plan: 30, fact: 40 }, { plan: 0, fact: 0 }] }]);
    expect(matrix.outflowGroups).toEqual([{ key: '5', cells: [{ plan: 0, fact: 0 }, { plan: 0, fact: 10 }] }]);
  });

  it('периоды: недели с понедельника, кварталы, границы по датам', () => {
    expect(matrixPeriods('2026-10-01', '2026-10-12', 'week').map((p) => [p.from, p.to])).toEqual([
      ['2026-10-01', '2026-10-04'],
      ['2026-10-05', '2026-10-11'],
      ['2026-10-12', '2026-10-12'],
    ]);
    expect(matrixPeriods('2026-01-01', '2026-12-31', 'quarter')).toHaveLength(4);
  });
});
