// © 2026 Bigfin
import { computeProratedPlan } from './computeProratedPlan';
import { changePercent, comparisonPeriod } from './computeComparison';
import { buildCumulative } from './computeCumulative';

/** FT-060…FT-062 ТЗ-3: план, сравнение, накопление на главной. */
describe('пропорциональный план (FT-060)', () => {
  it('AC: 21-го числа 31-дневного месяца при плане 750 000 — 508 065 ± 1', () => {
    const plan = computeProratedPlan([{ month: '2026-08-01', amount: 750000 }], { fromDate: '2026-08-01', toDate: '2026-08-31' }, '2026-08-21');
    expect(Math.abs(plan.proratedPlan - 508065)).toBeLessThanOrEqual(1);
    expect(plan).toMatchObject({ periodPlan: 750000, elapsedDays: 21, totalDays: 31 });
  });

  it('квартал: закрытые месяцы целиком + доля текущего; будущие — ноль', () => {
    const plan = computeProratedPlan(
      [
        { month: '2026-07-01', amount: 310000 },
        { month: '2026-08-01', amount: 310000 },
        { month: '2026-09-01', amount: 300000 },
      ],
      { fromDate: '2026-07-01', toDate: '2026-09-30' },
      '2026-08-10',
    );
    expect(plan.periodPlan).toBe(920000);
    expect(plan.proratedPlan).toBe(410000);
  });

  it('период закончился — пропорциональный план равен полному', () => {
    const plan = computeProratedPlan([{ month: '2026-06-01', amount: 300000 }], { fromDate: '2026-06-01', toDate: '2026-06-30' }, '2026-09-24');
    expect(plan.proratedPlan).toBe(300000);
  });

  it('половина месяца как период — половина плана месяца', () => {
    const plan = computeProratedPlan([{ month: '2026-09-01', amount: 300000 }], { fromDate: '2026-09-01', toDate: '2026-09-15' }, '2026-09-30');
    expect(plan.periodPlan).toBe(150000);
  });
});

describe('сравнение периодов (FT-061)', () => {
  const september = { fromDate: '2026-09-01', toDate: '2026-09-30' };

  it('прошлый период, два назад, прошлый год, произвольный', () => {
    expect(comparisonPeriod(september, 'previous')).toEqual({ kind: 'previous', fromDate: '2026-08-02', toDate: '2026-08-31' });
    expect(comparisonPeriod(september, 'previous2')).toEqual({ kind: 'previous2', fromDate: '2026-07-03', toDate: '2026-08-01' });
    expect(comparisonPeriod(september, 'last_year')).toEqual({ kind: 'last_year', fromDate: '2025-09-01', toDate: '2025-09-30' });
    expect(comparisonPeriod(september, 'custom', { fromDate: '2026-01-01', toDate: '2026-01-31' })).toEqual({
      kind: 'custom',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
    });
    expect(comparisonPeriod(september, 'custom', { fromDate: '2026-02-01' }).kind).toBe('previous');
  });

  it('AC: при нулевой базе процента нет', () => {
    expect(changePercent(100000, 0)).toBeNull();
    expect(changePercent(0, 0)).toBeNull();
    expect(changePercent(120, 100)).toBe(20);
    expect(changePercent(-50, -100)).toBe(50);
  });
});

describe('накопление по дням (FT-062)', () => {
  it('факт до сегодня, план доходит до плана периода, база — день в день', () => {
    const points = buildCumulative({
      period: { fromDate: '2026-09-01', toDate: '2026-09-30' },
      base: { fromDate: '2026-08-02', toDate: '2026-08-31' },
      today: '2026-09-02',
      factByDate: { '2026-09-01': 100, '2026-09-02': 50, '2026-09-05': 999 },
      baseByDate: { '2026-08-02': 10, '2026-08-03': 20 },
      plans: [{ month: '2026-09-01', amount: 300 }],
    });
    expect(points).toHaveLength(30);
    expect(points[0]).toEqual({ date: '2026-09-01', fact: 100, plan: 10, previous: 10 });
    expect(points[1]).toEqual({ date: '2026-09-02', fact: 150, plan: 20, previous: 30 });
    expect(points[2].fact).toBeNull();
    expect(points[29].plan).toBe(300);
  });

  it('без плана — линии плана нет', () => {
    const points = buildCumulative({
      period: { fromDate: '2026-09-01', toDate: '2026-09-02' },
      base: { fromDate: '2026-08-31', toDate: '2026-08-31' },
      today: '2026-09-30',
      factByDate: {},
      baseByDate: {},
      plans: [],
    });
    expect(points.map((p) => p.plan)).toEqual([null, null]);
    expect(points[1].previous).toBeNull();
  });
});
