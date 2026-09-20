// © 2026 Bigfin
import intl from 'react-intl-universal';

/**
 * День и месяц словами: «5 октября».
 *
 * ОДИН СПОСОБ НА ВЕСЬ ПРОДУКТ, и это главное.
 *
 * Найдено живым проходом: в блоке «Требует внимания» висело «Кассовый разрыв
 * 5 October» — английский месяц посреди русской фразы, а в ленте денег рядом
 * та же дата читалась «5 октября». Способов было два: лента считала через
 * `Intl`, а блок внимания — через `moment` с ГЛОБАЛЬНОЙ локалью.
 *
 * Глобальная локаль — состояние: её кто-то должен успеть выставить, файл
 * локали должен попасть в сборку, и порядок загрузки должен сойтись. Не
 * сошлось — и месяц молча становится английским. `Intl` спрашивает язык у
 * интерфейса в момент вызова, и ошибиться порядком там негде.
 */
export function formatDayMonth(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  const parsed = new Date(isoDate);

  // Неразобранная дата возвращается как есть: «Invalid Date» на экране
  // пугает сильнее, чем непривычный вид самой строки.
  if (Number.isNaN(parsed.getTime())) return String(isoDate);

  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
  }).format(parsed);
}

/**
 * Месяц и год словами: «октябрь 2026».
 *
 * Та же болезнь и то же лечение. Подпись месяца в «Анализе расходов»
 * собиралась через `moment(...).format('MMMM YYYY')` и давала «October 2026»
 * в русском интерфейсе.
 */
export function formatMonthYear(isoMonth: string | null | undefined): string {
  if (!isoMonth) return '';

  // «2026-10» — не дата: без дня `Date` разбирает её как UTC-полночь первого
  // числа, и это ровно то, что нужно.
  const parsed = new Date(`${String(isoMonth)}-01T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) return String(isoMonth);

  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}
