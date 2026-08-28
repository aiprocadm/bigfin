/**
 * Н1 карты v35. Подпись ячейки отчёта → число, если это число.
 *
 * Экспорт отчётов собирается из готовой таблицы, а в её ячейке лежит
 * только подпись: «2 975 000,00 ₽» — неразрывные пробелы между разрядами,
 * запятая разделителем, знак валюты внутри значения. Excel читает это как
 * текст: столбец не сложить и не отсортировать.
 *
 * Здесь разбор вынесен отдельной функцией: правило «что считать числом»
 * важнее всего остального в этой правке, и его надо проверять без Excel.
 *
 * Осторожность важнее полноты: превращаем в число только то, что заведомо
 * число. Дата «27.08.2026», код счёта «NR-BILL-2», название статьи —
 * остаются текстом.
 */

/** Пробелы, которыми продукт разделяет разряды (обычный и неразрывный). */
const SPACES = /[\s  ]/g;

/** Знаки валют, которые продукт печатает рядом с суммой. */
const CURRENCY = /[₽$€£¥]/g;

export interface ParsedNumber {
  value: number;
  /** Была ли в подписи валюта — по ней выбираем формат показа в Excel. */
  money: boolean;
}

export function parseReportNumber(raw: unknown): ParsedNumber | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const money = CURRENCY.test(trimmed);
  CURRENCY.lastIndex = 0;

  const bare = trimmed.replace(CURRENCY, '').replace(SPACES, '');
  if (!bare) return null;

  // Русский формат: запятая — разделитель дробной части.
  // Английский: точка дробная, запятая разделяет разряды.
  let normalized: string | null = null;

  if (/^-?\d+(,\d{1,4})?$/.test(bare)) {
    normalized = bare.replace(',', '.');
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(bare)) {
    normalized = bare.replace(/,/g, '');
  } else if (/^-?\d+(\.\d{1,4})?$/.test(bare)) {
    normalized = bare;
  }

  if (normalized === null) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? { value, money } : null;
}
