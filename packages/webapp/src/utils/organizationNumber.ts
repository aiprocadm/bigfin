import { amountSeparators, formatAmountWithGroups } from './amountInput';

/**
 * З3 карты v37. Дробное число печатается знаком организации.
 *
 * Суммы продукт печатает по-русски — «1 000,50 ₽» (карты v25, v26, v30).
 * А проценты и коэффициенты уходили в разметку как есть: ставка кредита
 * «12.5 %», доля в распределении затрат «33.3 %», показатель «1.75».
 * Точка в дроби — это язык JavaScript; на одном экране рядом стоят
 * «1 000,50 ₽» и «12.5 %», как будто их писали два разных продукта.
 *
 * Здесь один печатник на всё, что не сумма: у сумм есть свой —
 * `formatOrganizationMoney`, он ставит ещё и знак валюты.
 */
export interface OrganizationNumberOptions {
  /** Сколько знаков после запятой оставить. По умолчанию — сколько есть. */
  digits?: number;
  /** Чем печатать пустоту. По умолчанию — прочерк. */
  empty?: string;
}

export function formatOrganizationNumber(
  value: number | string | null | undefined,
  { digits, empty = '—' }: OrganizationNumberOptions = {},
): string {
  if (value === null || value === undefined || value === '') return empty;

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return empty;

  const canonical = digits === undefined ? String(numeric) : numeric.toFixed(digits);

  return formatAmountWithGroups(canonical, amountSeparators());
}
