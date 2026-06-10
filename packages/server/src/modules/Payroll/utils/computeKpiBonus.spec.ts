// © 2026 Bigfin
import { computeKpiBonus } from './computeKpiBonus';

const base = {
  metric: 'revenue',
  targetAmount: 1000000,
  bonusRate: 5,
  onlyIfAchieved: false,
};

describe('computeKpiBonus', () => {
  it('бонус — процент от факта, процент выполнения от плана', () => {
    const r = computeKpiBonus(base, 800000);
    expect(r.achievementPct).toBe(80);
    expect(r.bonus).toBe(40000); // 5% от 800 000
  });

  it('onlyIfAchieved: ниже плана → бонус 0', () => {
    const r = computeKpiBonus({ ...base, onlyIfAchieved: true }, 999999);
    expect(r.bonus).toBe(0);
    expect(r.achievementPct).toBe(100); // 99.9999 → round2
  });

  it('onlyIfAchieved: план выполнен → бонус считается от факта', () => {
    const r = computeKpiBonus({ ...base, onlyIfAchieved: true }, 1200000);
    expect(r.achievementPct).toBe(120);
    expect(r.bonus).toBe(60000);
  });

  it('нулевой план → achievementPct null, бонус всё равно от факта', () => {
    const r = computeKpiBonus({ ...base, targetAmount: 0 }, 500000);
    expect(r.achievementPct).toBeNull();
    expect(r.bonus).toBe(25000);
  });

  it('отрицательный факт (убыток по прибыли) → бонус 0', () => {
    const r = computeKpiBonus({ ...base, metric: 'profit' }, -50000);
    expect(r.bonus).toBe(0);
    expect(r.achievementPct).toBe(-5);
  });

  it('NaN-входы безопасны', () => {
    const r = computeKpiBonus(
      {
        metric: 'revenue',
        targetAmount: NaN,
        bonusRate: 'x' as any,
        onlyIfAchieved: false,
      },
      undefined as any,
    );
    expect(r.achievementPct).toBeNull();
    expect(r.bonus).toBe(0);
  });

  it('округляет бонус до копеек', () => {
    // 0.0333% от 100 000.33 = 33.3001...
    const r = computeKpiBonus({ ...base, bonusRate: 0.0333 }, 100000.33);
    expect(r.bonus).toBe(33.3);
  });
});
