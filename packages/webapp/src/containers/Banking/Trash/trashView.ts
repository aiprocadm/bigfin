// © 2026 Bigfin
import intl from 'react-intl-universal';

/** Причины удаления — как на сервере (FT-042 ТЗ-3). */
export const TRASH_REASONS = ['manual', 'import_rollback', 'reconciliation'] as const;

/** Ключ строки корзины: номера операций и строк выписки могут совпасть. */
export const trashKey = (item: { kind: string; id: number }) => `${item.kind}:${item.id}`;

/** Дата на языке интерфейса; пусто — прочерк. */
export function formatDay(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';
  return new Intl.DateTimeFormat(locale).format(date);
}
