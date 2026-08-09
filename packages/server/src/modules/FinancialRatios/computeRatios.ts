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
  /** Капитал отрицательный: показатели «на капитал» неприменимы. */
  equityNegative: boolean;
}

/** Безопасное деление: ноль/недопустимый знаменатель → null. */
const div = (numerator: number, denominator: number): number | null => {
  if (!denominator || !Number.isFinite(denominator)) return null;
  const r = numerator / denominator;
  return Number.isFinite(r) ? r : null;
};

/**
 * Считает набор коэффициентов из агрегатов Баланса/ОПиУ.
 *
 * Отрицательный капитал (накопленный убыток больше вложенного) обнуляет
 * смысл всех коэффициентов «на капитал»: убыток −300 000, делённый на
 * капитал −200 000, давал бодрые +150 % рентабельности там, где бизнес
 * фактически проеден. Для таких показателей возвращаем null — «неприменимо».
 */
export const computeRatios = (input: RatioInputs): FinancialRatios => {
  const equityUsable = input.equity > 0;

  return {
    roe: equityUsable ? div(input.netIncome, input.equity) : null,
    roa: div(input.netIncome, input.totalAssets),
    netMargin: div(input.netIncome, input.revenue),
    currentRatio: div(input.currentAssets, input.currentLiabilities),
    quickRatio: div(
      input.currentAssets - input.inventory,
      input.currentLiabilities,
    ),
    workingCapital: input.currentAssets - input.currentLiabilities,
    debtToEquity: equityUsable ? div(input.totalLiabilities, input.equity) : null,
    debtRatio: div(input.totalLiabilities, input.totalAssets),
    equityRatio: equityUsable ? div(input.equity, input.totalAssets) : null,
    /** Признак «капитал отрицательный» — чтобы страница объяснила прочерки. */
    equityNegative: input.equity < 0,
  };
};

/** Строка вертикального анализа ОПиУ: доля статьи от выручки. */
export interface VerticalRow {
  key: string;
  label: string;
  amount: number;
  share: number | null;
  /** 0 — раздел отчёта, 1 — статья внутри раздела. */
  level?: number;
  /** Ключ раздела, к которому относится статья. */
  parentKey?: string | null;
  /** Итоговая строка: её долю нельзя складывать с долями разделов. */
  isTotal?: boolean;
}

/**
 * Вертикальный анализ ОПиУ: для каждой строки — доля от выручки.
 * Разметка строки (раздел/статья/итог) переносится как есть — она нужна
 * экрану, чтобы не показывать итоги вперемешку с обычными строками.
 * @param {Array} lines — строки ОПиУ {key,label,amount}.
 * @param {number} revenue — выручка (база 100%).
 */
export const verticalAnalysis = (
  lines: Array<{
    key: string;
    label: string;
    amount: number;
    level?: number;
    parentKey?: string | null;
    isTotal?: boolean;
  }>,
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
