// © 2026 Bigfin
import intl from 'react-intl-universal';

/**
 * Сверка (FT-040 ТЗ-3) — подготовка к показу, без React.
 */

const num = (value: unknown) => (value === null || value === undefined || value === '' ? null : Number(value));

/**
 * Заголовок результата: «Остаток в Bigfin … · в банке … · расхождение …».
 * Остатка банка нет (интеграция его не отдаёт, таблица без остатков) —
 * говорим об этом прямо и показываем расхождение по операциям.
 */
export function reconciliationHeadline(rec: any, money: (value: number) => string): string {
  const ours = num(rec.our_balance ?? rec.ourBalance) ?? 0;
  const bank = num(rec.bank_balance ?? rec.bankBalance);
  const diff = num(rec.diff) ?? 0;
  if (bank === null) {
    return intl.get('reconciliation.headline_no_bank', { ours: money(ours), diff: money(diff) });
  }
  return intl.get('reconciliation.headline', { ours: money(ours), bank: money(bank), diff: money(diff) });
}

/** Два списка и сколько строк ещё ждут решения. */
export function splitItems(items: any[]) {
  const missingHere = items.filter((item) => item.side === 'missing_here');
  const missingBank = items.filter((item) => item.side === 'missing_bank');
  const open = items.filter((item) => !(item.resolved_as ?? item.resolvedAs)).length;
  return { missingHere, missingBank, open };
}
