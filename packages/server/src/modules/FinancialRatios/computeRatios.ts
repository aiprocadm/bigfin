/**
 * Чистые формулы финансовых коэффициентов (㉕ «Показатели PRO»).
 * Вход — агрегаты из Баланса и ОПиУ; деление на ноль → null («неприменимо»).
 */

/** Входные агрегаты из Баланса и ОПиУ за период. */
export interface RatioInputs {
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  currentAssets: number;
  currentLiabilities: number;
  inventory: number;
  revenue: number;
  netIncome: number;
}

/** Набор рассчитанных коэффициентов (null = неприменимо при нулевом знаменателе). */
export interface FinancialRatios {
  /** Рентабельность собственного капитала = чистая прибыль / капитал. */
  roe: number | null;
  /** Рентабельность активов = чистая прибыль / активы. */
  roa: number | null;
  /** Рентабельность по чистой прибыли = чистая прибыль / выручка. */
  netMargin: number | null;
  /** Текущая ликвидность = оборотные активы / краткосрочные обязательства. */
  currentRatio: number | null;
  /** Быстрая ликвидность = (оборотные активы − запасы) / краткосрочные обяз. */
  quickRatio: number | null;
  /** Оборотный капитал = оборотные активы − краткосрочные обязательства. */
  workingCapital: number;
  /** Долг/капитал = обязательства / капитал. */
  debtToEquity: number | null;
  /** Долговая нагрузка = обязательства / активы. */
  debtRatio: number | null;
  /** Коэффициент автономии (платёжеспособность) = капитал / активы. */
  equityRatio: number | null;
}

/** Безопасное деление: ноль/недопустимый знаменатель → null. */
const div = (numerator: number, denominator: number): number | null => {
  if (!denominator || !Number.isFinite(denominator)) return null;
  const r = numerator / denominator;
  return Number.isFinite(r) ? r : null;
};

/** Считает набор коэффициентов из агрегатов Баланса/ОПиУ. */
export const computeRatios = (input: RatioInputs): FinancialRatios => ({
  roe: div(input.netIncome, input.equity),
  roa: div(input.netIncome, input.totalAssets),
  netMargin: div(input.netIncome, input.revenue),
  currentRatio: div(input.currentAssets, input.currentLiabilities),
  quickRatio: div(input.currentAssets - input.inventory, input.currentLiabilities),
  workingCapital: input.currentAssets - input.currentLiabilities,
  debtToEquity: div(input.totalLiabilities, input.equity),
  debtRatio: div(input.totalLiabilities, input.totalAssets),
  equityRatio: div(input.equity, input.totalAssets),
});

/** Строка вертикального анализа ОПиУ: доля статьи от выручки. */
export interface VerticalRow {
  key: string;
  label: string;
  amount: number;
  share: number | null;
}

/**
 * Вертикальный анализ ОПиУ: для каждой строки — доля от выручки.
 * @param {Array} lines — строки ОПиУ {key,label,amount}.
 * @param {number} revenue — выручка (база 100%).
 */
export const verticalAnalysis = (
  lines: Array<{ key: string; label: string; amount: number }>,
  revenue: number,
): VerticalRow[] =>
  lines.map((l) => ({ ...l, share: div(l.amount, revenue) }));

/** Строка горизонтального анализа: динамика период-к-периоду. */
export interface HorizontalRow {
  key: string;
  label: string;
  current: number;
  previous: number;
  change: number;
  changePct: number | null;
}

/**
 * Горизонтальный анализ: абсолютное и относительное изменение к прошлому периоду.
 * @param {Array} current — строки текущего периода {key,label,amount}.
 * @param {Map} previousByKey — суммы прошлого периода по ключу.
 */
export const horizontalAnalysis = (
  current: Array<{ key: string; label: string; amount: number }>,
  previousByKey: Map<string, number>,
): HorizontalRow[] =>
  current.map((l) => {
    const previous = previousByKey.get(l.key) ?? 0;
    const change = l.amount - previous;
    return {
      key: l.key,
      label: l.label,
      current: l.amount,
      previous,
      change,
      changePct: div(change, Math.abs(previous)),
    };
  });
