import { describe, expect, it } from 'vitest';

import { planRings } from './planRings';

const progress = (proratedPlan: number, fact: number) => ({
  periodPlan: proratedPlan * 2,
  proratedPlan,
  elapsedDays: 15,
  totalDays: 30,
  fact,
  // Как считает сервер: факт к плану по сегодня, %; без плана — null.
  completionPercent: proratedPlan > 0 ? (fact / proratedPlan) * 100 : null,
});

describe('кольца плана на главной', () => {
  it('доходы, расходы и прибыль — доля плана по сегодня', () => {
    const rings = planRings({ income: progress(100_000, 80_000), expenses: progress(60_000, 45_000) });
    expect(rings.map((r) => r.key)).toEqual(['income', 'expenses', 'profit']);
    expect(rings[0].value).toBeCloseTo(0.8);
    expect(rings[1].value).toBeCloseTo(0.75);
    // Прибыль: (80 − 45) / (100 − 60) = 0,875.
    expect(rings[2].value).toBeCloseTo(0.875);
  });

  it('план прибыли в ноль или в убыток — процента нет', () => {
    const rings = planRings({ income: progress(50_000, 10_000), expenses: progress(50_000, 5_000) });
    expect(rings[2].value).toBeNull();
  });

  it('нет плана доходов — нет и колец доходов и прибыли', () => {
    const rings = planRings({ income: null, expenses: progress(10, 5) });
    expect(rings.map((r) => r.key)).toEqual(['expenses']);
  });

  it('план по сегодня нулевой (первый день, пустой бюджет) — процента нет', () => {
    expect(planRings({ income: progress(0, 100), expenses: null })[0].value).toBeNull();
  });

  it('процент — сервера, витрина его не пересчитывает', () => {
    const odd = { ...progress(100, 50), completionPercent: 61.2 };
    expect(planRings({ income: odd, expenses: null })[0].value).toBeCloseTo(0.612);
  });
});
