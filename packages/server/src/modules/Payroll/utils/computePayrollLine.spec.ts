// © 2026 Bigfin
import { computePayrollLine } from './computePayrollLine';
import { PAYROLL_SETTINGS_DEFAULTS } from '../constants';

const S = PAYROLL_SETTINGS_DEFAULTS; // 13% НДФЛ, 30% взносы, standard

describe('computePayrollLine', () => {
  it('штатный, стандартные взносы: НДФЛ 13%, взносы 30%', () => {
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 100000, bonusAmount: 0, deductionAmount: 0 },
      S,
    );
    expect(r.ndflAmount).toBe(13000);
    expect(r.contributionsAmount).toBe(30000);
    expect(r.netAmount).toBe(87000);
    expect(r.totalCost).toBe(130000);
  });

  it('штатный, режим МСП: 30% до порога + 15% сверх', () => {
    const msp = { ...S, contribMode: 'msp' as const, mspThreshold: 40000 };
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 100000, bonusAmount: 0, deductionAmount: 0 },
      msp,
    );
    // 40000×30% + 60000×15% = 12000 + 9000
    expect(r.contributionsAmount).toBe(21000);
  });

  it('МСП ниже порога: вся сумма по 30%', () => {
    const msp = { ...S, contribMode: 'msp' as const, mspThreshold: 40000 };
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 30000, bonusAmount: 0, deductionAmount: 0 },
      msp,
    );
    expect(r.contributionsAmount).toBe(9000);
  });

  it('ГПХ считается как штатный (НДФЛ + взносы)', () => {
    const r = computePayrollLine(
      { employmentType: 'gph', baseAmount: 50000, bonusAmount: 0, deductionAmount: 0 },
      S,
    );
    expect(r.ndflAmount).toBe(6500);
    expect(r.contributionsAmount).toBe(15000);
  });

  it('самозанятый и ИП: без НДФЛ и взносов, на руки = gross − удержание', () => {
    for (const t of ['npd', 'ip'] as const) {
      const r = computePayrollLine(
        { employmentType: t, baseAmount: 80000, bonusAmount: 5000, deductionAmount: 1000 },
        S,
      );
      expect(r.ndflAmount).toBe(0);
      expect(r.contributionsAmount).toBe(0);
      expect(r.netAmount).toBe(84000);
      expect(r.totalCost).toBe(85000);
    }
  });

  it('премия входит в базу, удержание — после налогов', () => {
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 100000, bonusAmount: 20000, deductionAmount: 5000 },
      S,
    );
    expect(r.ndflAmount).toBe(15600); // 120000 × 13%
    expect(r.netAmount).toBe(99400); // 120000 − 15600 − 5000
  });

  it('NaN-safe: нечисловые входы трактуются как 0', () => {
    const r = computePayrollLine(
      {
        employmentType: 'staff',
        baseAmount: 'abc' as any,
        bonusAmount: undefined as any,
        deductionAmount: NaN,
      },
      S,
    );
    expect(r.netAmount).toBe(0);
    expect(r.totalCost).toBe(0);
  });

  it('округляет до копеек', () => {
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 33333.33, bonusAmount: 0, deductionAmount: 0 },
      S,
    );
    expect(r.ndflAmount).toBe(4333.33); // 4333.3329 → 4333.33
  });
});
