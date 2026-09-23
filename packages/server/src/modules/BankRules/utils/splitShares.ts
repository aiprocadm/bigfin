// © 2026 Bigfin
/**
 * Разбиение суммы операции по долям правила «Разбить и заполнить» (FT-031).
 *
 * Считается в КОПЕЙКАХ, целыми числами: 0.1 + 0.2 в дробных даёт
 * 0.30000000000000004, и части «почти» сходятся с родителем — а в сверке
 * с банком такие копейки ищут часами.
 *
 * Копеечный остаток отдаётся ПЕРВОЙ строке — так сказано в ТЗ. (У
 * `TransactionSplits/utils/splitRules.ts` остаток уходит последней строке:
 * это другое, ручное разбиение, и его поведение здесь не трогается.)
 */

/** Допуск суммы долей: 100 % с точностью до четырёх знаков, как в базе. */
const SHARE_EPSILON = 0.00005;

export interface ShareCheck {
  isValid: boolean;
  total: number;
  problem: 'empty' | 'non_positive_share' | 'not_hundred' | null;
}

/** Доли в сумме дают 100 % и каждая больше нуля. */
export function validateShares(shares: number[]): ShareCheck {
  const total = Math.round(shares.reduce((sum, share) => sum + Number(share || 0), 0) * 10000) / 10000;
  if (shares.length === 0) return { isValid: false, total, problem: 'empty' };
  if (shares.some((share) => !(Number(share) > 0))) {
    return { isValid: false, total, problem: 'non_positive_share' };
  }
  if (Math.abs(total - 100) > SHARE_EPSILON) {
    return { isValid: false, total, problem: 'not_hundred' };
  }
  return { isValid: true, total, problem: null };
}

/**
 * Суммы частей. Их сумма СТРОГО равна `amount` при любых долях, дающих
 * 100 %: остаток от округления вниз добирается первой строкой.
 */
export function splitByShares(amount: number, shares: number[]): number[] {
  const cents = Math.round(Math.abs(Number(amount)) * 100);
  // Малый запас от погрешности дробей: 1200 × 91,666…/100 даёт 1099,999…,
  // и без него округление вниз теряло бы целую копейку.
  const parts = shares.map((share) => Math.floor((cents * Number(share)) / 100 + 1e-7));
  const remainder = cents - parts.reduce((sum, part) => sum + part, 0);
  if (parts.length > 0) parts[0] += remainder;
  return parts.map((part) => part / 100);
}

/**
 * Суммы частей в валюте учёта по суммам частей в валюте операции — целыми
 * копейками, остаток первой строке. При курсе 1 части проводятся ровно
 * такими, какими их ввёл человек; при другом курсе сумма частей строго
 * равна сумме по счёту денег, и проводка сходится.
 */
export function splitByAmounts(amount: number, partAmounts: number[]): number[] {
  const cents = Math.round(Math.abs(Number(amount)) * 100);
  const partCents = partAmounts.map((part) => Math.round(Math.abs(Number(part)) * 100));
  const totalCents = partCents.reduce((sum, part) => sum + part, 0);
  if (totalCents === 0) return partAmounts.map(() => 0);
  // Целочисленная арифметика: произведение и деление — без дробей.
  const parts = partCents.map((part) => Math.floor((cents * part) / totalCents));
  const remainder = cents - parts.reduce((sum, part) => sum + part, 0);
  if (parts.length > 0) parts[0] += remainder;
  return parts.map((part) => part / 100);
}
