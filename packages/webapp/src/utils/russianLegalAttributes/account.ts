/**
 * Базовая валидация банковских счетов.
 * На старте — только длина и формат. Полная проверка banking-key
 * (контрольная сумма расчётного счёта) — в backlog.
 */

export function isValidBankAccount(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{20}$/.test(value);
}

export function isValidCorrespondentAccount(value: string): boolean {
  if (typeof value !== 'string') return false;
  // Корр.счёт всегда начинается с 30101
  return /^30101\d{15}$/.test(value);
}
