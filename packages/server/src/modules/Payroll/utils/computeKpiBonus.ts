// © 2026 Bigfin
import { toNumber, round2 } from './payrollMath';

export interface KpiBonusInput {
  metric: string;
  targetAmount: number;
  bonusRate: number;
  onlyIfAchieved: boolean;
}

export interface KpiBonusComputed {
  achievementPct: number | null;
  bonus: number;
}

/**
 * Расчёт бонуса менеджера от факта показателя (спека ⑧b §3).
 * Бонус = процент от факта; опция «только при выполнении плана» обнуляет
 * бонус при недовыполнении. NaN-safe: нечисловые входы → 0.
 */
export function computeKpiBonus(
  input: KpiBonusInput,
  fact: number,
): KpiBonusComputed {
  const target = toNumber(input.targetAmount);
  const rate = toNumber(input.bonusRate);
  const safeFact = toNumber(fact);

  const achievementPct =
    target > 0 ? round2((safeFact / target) * 100) : null;

  let bonus = round2((Math.max(0, safeFact) * rate) / 100);
  if (input.onlyIfAchieved && safeFact < target) bonus = 0;

  return { achievementPct, bonus };
}
