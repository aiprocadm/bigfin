/**
 * Валидация российского ИНН (Идентификационный номер налогоплательщика).
 *
 * 10-значный — для юр.лиц (ООО, АО).
 * 12-значный — для физлиц, ИП, самозанятых (НПД).
 *
 * Алгоритм контрольной суммы — приказ ФНС России от 29.06.2012 № ММВ-7-6/435@.
 */

// Коэффициенты для подсчёта последней цифры 10-значного ИНН
const COEFF_10 = [2, 4, 10, 3, 5, 9, 4, 6, 8, 0];

// Коэффициенты для двух контрольных цифр 12-значного ИНН
const COEFF_12_FIRST = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
const COEFF_12_SECOND = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];

function checksumDigit(digits: number[], coefficients: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * coefficients[i], 0);
  return (sum % 11) % 10;
}

export function isValidInn(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d+$/.test(value)) return false;
  if (value.length !== 10 && value.length !== 12) return false;

  const digits = value.split('').map(Number);

  if (value.length === 10) {
    const expected = checksumDigit(digits.slice(0, 10), COEFF_10);
    return expected === digits[9];
  }

  // 12-значный: две контрольные цифры
  const expected11 = checksumDigit(digits.slice(0, 11), COEFF_12_FIRST);
  const expected12 = checksumDigit(digits.slice(0, 12), COEFF_12_SECOND);
  return expected11 === digits[10] && expected12 === digits[11];
}
