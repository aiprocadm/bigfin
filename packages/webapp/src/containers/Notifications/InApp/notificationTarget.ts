// © 2026 Bigfin

/**
 * У3 карты v27. Куда ведёт клик по уведомлению.
 *
 * У каждого события есть очевидный адрес: просрочка — к счетам покупателям,
 * низкий остаток — к кассам и счетам, кассовый разрыв — к платёжному
 * календарю, налог — на главную к плитке «Налог за квартал». Для события
 * без адреса клик ведёт себя по-старому: только гасит непрочитанность.
 */
const TARGETS: Record<string, string> = {
  overdue: '/invoices',
  low_balance: '/cashflow-accounts',
  cash_gap: '/payment-calendar',
  tax_due: '/',
};

export const notificationTargetPath = (eventType: string): string | null =>
  TARGETS[eventType] ?? null;
