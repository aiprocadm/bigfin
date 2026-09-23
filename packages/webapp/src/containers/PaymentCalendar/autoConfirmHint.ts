// © 2026 Bigfin
/**
 * Подсказка автоподтверждения плана (FT-052 ТЗ-3): сработает ли оно при
 * текущем наборе полей, и что ИМЕННО заполнить, чтобы сработало. Те же
 * условия, что проверяет сервер при появлении факта.
 */
export type AutoConfirmGap = 'account' | 'contact' | 'amount' | 'date';

export function autoConfirmHint(values: {
  accountId?: number | null;
  contactId?: number | null;
  amount?: number | null;
  plannedDate?: string | null;
  matchAnyContact?: boolean;
}): { ready: boolean; missing: AutoConfirmGap[] } {
  const missing: AutoConfirmGap[] = [];
  if (!values.accountId) missing.push('account');
  if (!values.matchAnyContact && !values.contactId) missing.push('contact');
  if (!(Number(values.amount) > 0)) missing.push('amount');
  if (!values.plannedDate) missing.push('date');
  return { ready: missing.length === 0, missing };
}
