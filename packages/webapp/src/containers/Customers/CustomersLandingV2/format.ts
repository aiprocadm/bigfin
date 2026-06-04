export type CustomerStatus = 'active' | 'inactive';

/** Boolean флаг активности → ключ статуса (для i18n и бейджа). */
export function customerStatus(active: boolean): CustomerStatus {
  return active ? 'active' : 'inactive';
}

/** Отрицательный ли баланс (для подсветки красным). */
export function isNegativeBalance(amount: number): boolean {
  return Number(amount) < 0;
}

/** Денежный формат ru-RU. Пустой/нечисловой вход → 0. Валюта по умолчанию — RUB. */
export function formatBalance(amount: number, currencyCode = 'RUB'): string {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencyCode || 'RUB',
    maximumFractionDigits: 2,
  }).format(value);
}
