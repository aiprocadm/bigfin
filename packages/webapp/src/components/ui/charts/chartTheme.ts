/**
 * Тема графиков (§6.1–6.2 ТЗ-4): цвета рядов, сетка, оси, кривые.
 *
 * ЕДИНСТВЕННОЕ МЕСТО, ГДЕ ГРАФИК БЕРЁТ ЦВЕТ. Тринадцать графиков были
 * раскрашены тринадцатью способами: `#e0a800` зашитым значением, `var(--c-…)`
 * без `rgb()` (браузер такой цвет не понимает), расход красным. Здесь цвета —
 * токены `--c-chart-*`, поэтому тёмная тема получается сама. Сторож
 * `chartsFollowRules.spec` не пускает цвет в обход этого файла.
 */
const token = (name: string) => `rgb(var(--c-${name}))`;

export const chartColor = {
  /** Главный ряд: остаток, выручка, факт, прибыль. */
  ink: token('chart-1'),
  /** Приход. */
  income: token('chart-2'),
  /** Расход, прошлый период, план — приглушённым. Расход не красный. */
  expense: token('chart-3'),
  /** Только зона разрыва и просрочки. */
  problem: token('chart-problem'),
  /** Только точка «сегодня». */
  brand: token('chart-brand'),
  /** Линии сетки. */
  grid: token('border'),
  /** Подписи осей. */
  axis: token('text-muted'),
} as const;

/** Ряды по порядку для категорий: вторая, третья… категория. */
export const CHART_SERIES = [
  token('chart-1'),
  token('chart-4'),
  token('chart-5'),
  token('chart-6'),
  token('chart-7'),
  token('chart-8'),
  token('chart-2'),
  token('chart-3'),
] as const;

/** Цвет категории по номеру: после восьмой палитра идёт по кругу. */
export const seriesColor = (index: number) => CHART_SERIES[index % CHART_SERIES.length];

/**
 * Кривые (R17). Финансовые линии не сглаживаются: остаток — ступенька, ряды
 * по месяцам — ломаная. Сглаженная кривая придумывает значения между точками.
 */
export const CURVE = { balance: 'stepAfter', series: 'linear' } as const;

/** Сетка — только горизонтальная, пунктиром. */
export const gridProps = {
  strokeDasharray: '3 3',
  vertical: false,
  stroke: chartColor.grid,
} as const;

const tick = { fontSize: 12, fill: chartColor.axis } as const;

/** Ось времени / категорий: без чёрточек, подписи горизонтальны всегда. */
export const xAxisProps = {
  tickLine: false,
  axisLine: false,
  tick,
  minTickGap: 8,
} as const;

/** Ось значений: без линии, ширина под «1,6 млн ₽». */
export const yAxisProps = {
  tickLine: false,
  axisLine: false,
  tick,
  width: 80,
} as const;

/**
 * Столбик не шире 56 точек: один клиент в «Парето» растягивался на всю
 * карточку чёрной плитой (живой проход этапа 46).
 */
export const BAR_MAX_SIZE = 56;

/** Скругление верха столбика — радиус органа управления, 4 точки. */
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

/**
 * Столбики растут только при первом показе и не при «уменьшить движение»
 * (§6.3: анимация роста при каждой загрузке запрещена).
 */
export function chartAnimation(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
