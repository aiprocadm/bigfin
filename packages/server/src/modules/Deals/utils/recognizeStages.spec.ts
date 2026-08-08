// © 2026 Bigfin
import { recognizeStagesByPeriod, summarizeDealStages } from './recognizeStages';

const stage = (over: any = {}) => ({
  plannedRevenue: 0, plannedCost: 0, status: 'open', closedDate: null, ...over,
});

describe('recognizeStagesByPeriod', () => {
  it('groups closed stages by close month', () => {
    const r = recognizeStagesByPeriod([
      stage({ plannedRevenue: 100, plannedCost: 40, status: 'closed', closedDate: '2026-03-10' }),
      stage({ plannedRevenue: 50, plannedCost: 10, status: 'closed', closedDate: '2026-03-25' }),
      stage({ plannedRevenue: 400, plannedCost: 300, status: 'closed', closedDate: '2026-05-01' }),
    ]);
    expect(r['2026-03']).toEqual({ revenue: 150, costs: 50, profit: 100 });
    expect(r['2026-05']).toEqual({ revenue: 400, costs: 300, profit: 100 });
  });

  it('ignores open stages and stages without a close date', () => {
    const r = recognizeStagesByPeriod([
      stage({ plannedRevenue: 100, status: 'open' }),
      stage({ plannedRevenue: 100, status: 'closed', closedDate: null }),
    ]);
    expect(r).toEqual({});
  });

  // Драйвер MySQL отдаёт колонку DATE объектом Date — именно так эта функция
  // и вызывается в бою. Прежний срез строки давал ключ «Mon Jul» (приёмка ㉘).
  it('группирует правильно, когда дата пришла объектом Date, а не строкой', () => {
    const r = recognizeStagesByPeriod([
      stage({
        plannedRevenue: 150,
        plannedCost: 90,
        status: 'closed',
        closedDate: new Date('2026-07-20T00:00:00'),
      }),
      stage({
        plannedRevenue: 50,
        plannedCost: 20,
        status: 'closed',
        closedDate: new Date('2026-07-28T00:00:00'),
      }),
    ]);
    expect(Object.keys(r)).toEqual(['2026-07']);
    expect(r['2026-07']).toEqual({ revenue: 200, costs: 110, profit: 90 });
  });

  it('не схлопывает разные годы с одинаковым месяцем', () => {
    const r = recognizeStagesByPeriod([
      stage({ plannedRevenue: 10, status: 'closed', closedDate: new Date('2025-07-20T00:00:00') }),
      stage({ plannedRevenue: 20, status: 'closed', closedDate: new Date('2026-07-20T00:00:00') }),
    ]);
    expect(Object.keys(r).sort()).toEqual(['2025-07', '2026-07']);
  });
});

describe('summarizeDealStages', () => {
  const fact = { revenue: 120, costs: 30, profit: 90 };

  it('sums planned (all) and recognized (closed) and computes progress', () => {
    const s = summarizeDealStages(
      [
        stage({ plannedRevenue: 100, plannedCost: 40, status: 'closed', closedDate: '2026-03-10' }),
        stage({ plannedRevenue: 400, plannedCost: 300, status: 'open' }),
      ],
      fact,
    );
    expect(s.planned).toEqual({ revenue: 500, costs: 340, profit: 160 });
    expect(s.recognized).toEqual({ revenue: 100, costs: 40, profit: 60 });
    expect(s.progress).toBeCloseTo(100 / 500);
    expect(s.fact).toEqual(fact);
  });

  it('returns zero summary and progress 0 when there are no stages', () => {
    const s = summarizeDealStages([], fact);
    expect(s.planned).toEqual({ revenue: 0, costs: 0, profit: 0 });
    expect(s.recognized).toEqual({ revenue: 0, costs: 0, profit: 0 });
    expect(s.progress).toBe(0);
  });
});
