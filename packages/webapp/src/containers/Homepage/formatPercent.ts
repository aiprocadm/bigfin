import intl from 'react-intl-universal';

/**
 * Процент словами интерфейса: «42,5» по-русски, «42.5» по-английски.
 *
 * Один знак после запятой: десятые доли процента на главной ещё что-то
 * значат, сотые — уже шум.
 */
export function formatPercent(value: number): string {
  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';

  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}
