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
