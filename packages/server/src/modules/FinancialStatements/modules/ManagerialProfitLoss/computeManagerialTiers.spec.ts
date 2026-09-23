// © 2026 Bigfin
import { computeManagerialTiers, marginOf } from './computeManagerialTiers';

/**
 * Ярусы управленческой прибыли (FT-010 ТЗ-3): формулы, деление на ноль,
 * отрицательная выручка.
 */
describe('ярусы управленческой прибыли', () => {
  it('критерий 1: выручка 397 385, прямые переменные 83 345,93 → МД 314 039,07 и 79,03 %', () => {
    const tiers = computeManagerialTiers({
      revenue: 397385,
      direct_variable: 83345.93,
    });

    expect(tiers.md).toBe(314039.07);
    expect(tiers.margins.md).toEqual({ value: 79.03, applicable: true });
  });

  it('полная лестница по формулам ТЗ', () => {
    const tiers = computeManagerialTiers({
      revenue: 1000,
      direct_variable: 100,
      direct_production: 200,
      overhead_production: 50,
      administrative: 150,
      commercial: 100,
      other_income_below_ebitda: 30,
      below_ebitda: 80,
      below_net_profit: 500,
    });

    expect(tiers.md).toBe(900);
    expect(tiers.gp1).toBe(700);
    expect(tiers.gp2).toBe(650);
    expect(tiers.op).toBe(400);
    // «Ниже чистой прибыли» (дивиденды) на ЧП не влияет.
    expect(tiers.np).toBe(350);
    expect(tiers.margins.np.value).toBe(35);
  });

  it('критерий 3: выручка ноль — ни одна рентабельность не «0 %» и не «100 %»', () => {
    const tiers = computeManagerialTiers({ administrative: 100 });

    Object.values(tiers.margins).forEach((margin) => {
      expect(margin).toEqual({ value: null, applicable: false });
    });
    // Период без выручки, но с расходами: МД ноль, дальше — минус расходы.
    expect(tiers.op).toBe(-100);
  });

  it('отрицательная выручка (массовые возвраты) — рентабельность не определена', () => {
    expect(marginOf(-50, -200)).toEqual({ value: null, applicable: false });
  });

  it('пустой вход — нули, а не NaN', () => {
    const tiers = computeManagerialTiers({});

    expect([tiers.md, tiers.gp1, tiers.gp2, tiers.op, tiers.np]).toEqual([0, 0, 0, 0, 0]);
  });
});
