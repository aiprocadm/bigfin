// © 2026 Bigfin
/**
 * Правила показа экрана «Анализ расходов» (этап 9 ТЗ).
 *
 * Сервер уже посчитал числа. Здесь решается только одно: что из них показать
 * и о чём предупредить. Это тоже место для ошибок, которые не падают, —
 * например, нарисовать уверенную точку безубыточности, когда половина статей
 * не размечена.
 */

export interface MetricValue {
  value: number;
  applicable: boolean;
}

export interface ExpensesSplit {
  fixed: number;
  variable: number;
  unset: number;
  total: number;
  fixedShare: number;
  variableShare: number;
  unsetShare: number;
  unsetArticles: number;
}

export interface ExpensesSplitRow {
  key: 'fixed' | 'variable' | 'unset';
  labelKey: string;
  amount: number;
  share: number;
}

const SPLIT_LABEL_KEY: Record<'fixed' | 'variable' | 'unset', string> = {
  fixed: 'expenses_analysis.fixed',
  variable: 'expenses_analysis.variable',
  unset: 'expenses_analysis.unset',
};

/**
 * Строки разделения расходов.
 *
 * Корзина «не размечено» показывается, только когда в ней что-то есть: у
 * аккуратно размеченной фирмы лишняя нулевая строка намекала бы на проблему,
 * которой нет. А постоянные и переменные показываются всегда — их ноль
 * осмыслен: «постоянных расходов не было».
 */
export function buildSplitRows(
  split: ExpensesSplit | undefined,
): ExpensesSplitRow[] {
  if (!split) return [];

  const rows: ExpensesSplitRow[] = [
    {
      key: 'fixed',
      labelKey: SPLIT_LABEL_KEY.fixed,
      amount: split.fixed,
      share: split.fixedShare,
    },
    {
      key: 'variable',
      labelKey: SPLIT_LABEL_KEY.variable,
      amount: split.variable,
      share: split.variableShare,
    },
  ];

  if (split.unset > 0) {
    rows.push({
      key: 'unset',
      labelKey: SPLIT_LABEL_KEY.unset,
      amount: split.unset,
      share: split.unsetShare,
    });
  }

  return rows;
}

export type ExpensesWarning =
  /** Ни одна статья не помечена постоянной — считать безубыточность не из чего. */
  | 'no_fixed'
  /** Часть расходов не размечена — числа занижены. */
  | 'partly_unmarked'
  | null;

/**
 * О чём предупредить над цифрами.
 *
 * Это главное на экране после самих чисел. Точка безубыточности, посчитанная
 * по половине расходов, выглядит так же уверенно, как правильная, — и человек
 * примет по ней решение. Предупреждение обязано быть заметным.
 *
 * «Постоянных нет вовсе» важнее, чем «часть не размечена»: без постоянных
 * затрат безубыточность вырождается, и показывать её как готовый ответ нельзя.
 */
export function expensesWarning(
  split: ExpensesSplit | undefined,
  hasFixedArticles: boolean | undefined,
): ExpensesWarning {
  if (!split || split.total === 0) return null;
  if (!hasFixedArticles) return 'no_fixed';
  if (split.unsetArticles > 0) return 'partly_unmarked';
  return null;
}

/**
 * Показывать ли число метрики или прочерк.
 *
 * Неприменимая метрика — это не ноль. «Запас прочности 0%» читается как
 * «на грани», а на деле означает «посчитать нельзя».
 */
export function isMetricShown(metric: MetricValue | undefined): boolean {
  return Boolean(metric?.applicable);
}

/**
 * Доля расходов в выручке по месяцам — только месяцы, где доля посчитана.
 *
 * Месяц без выручки рвёт линию, и это правильно: провести линию через ноль
 * значило бы нарисовать «расходы упали до нуля», хотя они были.
 */
export function chartablePoints<T extends { share: number | null }>(
  monthly: T[] | undefined,
): T[] {
  return (monthly ?? []).filter((point) => point.share != null);
}

/** Деньги, прошедшие мимо статей (остаток Р4 этапа 9). */
export interface UnmappedTotals {
  income: number;
  expense: number;
  accountsCount: number;
}

/**
 * Показывать ли строку «мимо статей».
 *
 * ЗАЧЕМ ВООБЩЕ. Счёт, не привязанный ни к одной статье, молча выпадал из
 * анализа: итог оказывался меньше, чем в ОПиУ, и ничто на это не указывало.
 * Человек замечал расхождение через месяц и не знал, где искать.
 *
 * Показываем, ТОЛЬКО когда за период по таким счетам и правда были деньги.
 * У размеченной фирмы вечная плашка «всё в порядке» — шум, который перестают
 * читать, а вместе с ним перестают читать и настоящие предупреждения.
 */
export function shouldShowUnmapped(
  unmapped: UnmappedTotals | undefined,
): boolean {
  if (!unmapped) return false;

  return unmapped.expense !== 0 || unmapped.income !== 0;
}
