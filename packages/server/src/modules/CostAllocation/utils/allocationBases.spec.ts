// © 2026 Bigfin
import { allocateByBase, baseWeights } from './allocationBases';

/** Базы распределения косвенных расходов (FT-011 ТЗ-3). */
describe('базы распределения', () => {
  const targets = [
    { id: 3, name: 'Wildberries', revenue: 200, grossProfit1: 50, productionPayroll: 10 },
    { id: 1, name: 'OZON', revenue: 600, grossProfit1: -20, productionPayroll: 30 },
    { id: 2, name: 'Розница', revenue: 200, grossProfit1: 150, productionPayroll: 0 },
  ];

  it('критерий 3: поровну между тремя — по трети, копейка первой по алфавиту', () => {
    const { amounts } = allocateByBase(100, 'equal', targets);

    // Алфавит русский: кириллица раньше латиницы — «Розница» первая.
    expect(amounts).toEqual([
      { dealId: 2, amount: 33.34 }, // Розница
      { dealId: 1, amount: 33.33 }, // OZON
      { dealId: 3, amount: 33.33 }, // Wildberries
    ]);
    expect(amounts.reduce((s, a) => s + a.amount, 0)).toBeCloseTo(100, 10);
  });

  it('по выручке — пропорционально, сумма ровно равна пулу', () => {
    const { amounts } = allocateByBase(1000, 'revenue', targets);
    expect(amounts.map((a) => [a.dealId, a.amount])).toEqual([
      [2, 200],
      [1, 600],
      [3, 200],
    ]);
  });

  it('отрицательная ВП1 — вес ноль, а не «заработок на чужой аренде»', () => {
    expect(baseWeights('gross_profit_1', targets).find((w) => w.dealId === 1)!.weight).toBe(0);
  });

  it('база нулевая у всех — распределения нет, это видно', () => {
    const { amounts, zeroBase } = allocateByBase(
      500,
      'production_payroll',
      targets.map((t) => ({ ...t, productionPayroll: 0 })),
    );
    expect(amounts).toEqual([]);
    expect(zeroBase).toBe(true);
  });

  it('вручную — по заданным весам', () => {
    const { amounts } = allocateByBase(90, 'manual_share', targets, { 1: 1, 2: 2 });
    expect(amounts.map((a) => [a.dealId, a.amount])).toEqual([
      [2, 60],
      [1, 30],
    ]);
  });
});
