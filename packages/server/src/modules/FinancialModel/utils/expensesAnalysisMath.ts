// © 2026 Bigfin
import { MetricValue } from './financialMath';

/**
 * Расчёты экрана «Анализ расходов» (этап 9 ТЗ).
 *
 * Здесь только чистые правила — без базы. Это сделано намеренно: почти все
 * ошибки такого экрана не падают, а показывают правдоподобное неверное число,
 * и поймать их можно только проверками на голых данных.
 */

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface ExpenseArticleRow {
  id: number;
  name: string;
  /** 'income' | 'expense' */
  kind: string;
  /** 'fixed' | 'variable' | null — поле в базе допускает пустоту. */
  costBehavior?: string | null;
  /** Собственная сумма статьи за период (без потомков). */
  amount: number;
}

export interface ExpensesSplit {
  fixed: number;
  variable: number;
  /** Расходы по статьям, которым не проставили «постоянный / переменный». */
  unset: number;
  total: number;
  fixedShare: number;
  variableShare: number;
  unsetShare: number;
  /** Сколько статей ждут разметки — их видно на экране отдельной строкой. */
  unsetArticles: number;
}

/**
 * Делит расходы периода на постоянные, переменные и **не размеченные**.
 *
 * Третья корзина — не педантизм. Поле «постоянный / переменный» в базе
 * допускает пустоту. Если молча отнести пустые к переменным, постоянные
 * затраты окажутся заниженными, а точка безубыточности — ближе, чем на самом
 * деле: программа скажет «вы уже в плюсе», когда это не так.
 *
 * Суммы берутся СОБСТВЕННЫЕ (own): пометка и у родителя, и у потомка иначе
 * задвоила бы сумму.
 */
export function splitExpensesByBehavior(
  rows: ExpenseArticleRow[],
): ExpensesSplit {
  const expenses = rows.filter((row) => row.kind === 'expense');

  const sumOf = (predicate: (row: ExpenseArticleRow) => boolean): number =>
    round2(
      expenses
        .filter(predicate)
        .reduce((sum, row) => sum + (row.amount ?? 0), 0),
    );

  const fixed = sumOf((row) => row.costBehavior === 'fixed');
  const variable = sumOf((row) => row.costBehavior === 'variable');
  const unset = sumOf(
    (row) => row.costBehavior !== 'fixed' && row.costBehavior !== 'variable',
  );
  const total = round2(fixed + variable + unset);

  const share = (part: number): number =>
    total > 0 ? round2(part / total) : 0;

  return {
    fixed,
    variable,
    unset,
    total,
    fixedShare: share(fixed),
    variableShare: share(variable),
    unsetShare: share(unset),
    unsetArticles: expenses.filter(
      (row) =>
        row.costBehavior !== 'fixed' &&
        row.costBehavior !== 'variable' &&
        (row.amount ?? 0) !== 0,
    ).length,
  };
}

/**
 * Запас прочности: на сколько процентов может упасть выручка, прежде чем
 * бизнес уйдёт в убыток.
 *
 * (выручка − выручка безубыточности) ÷ выручка.
 *
 * Неприменим, если выручки нет (делить не на что) или безубыточность
 * недостижима при текущей марже — там запаса нет вовсе, а не «ноль
 * процентов».
 */
export function computeSafetyMargin(
  revenue: number,
  breakEven: MetricValue,
): MetricValue {
  if (!breakEven?.applicable) return { value: 0, applicable: false };
  if (!Number.isFinite(revenue) || revenue <= 0) {
    return { value: 0, applicable: false };
  }
  return {
    value: round2((revenue - breakEven.value) / revenue),
    applicable: true,
  };
}

/**
 * Доля расходов в выручке. null — когда выручки нет: доля от нуля ничего не
 * значит, а нарисованный ноль читался бы как «расходов нет».
 */
export function computeExpenseShare(
  revenue: number,
  expenses: number,
): number | null {
  if (!Number.isFinite(revenue) || revenue <= 0) return null;
  return round2(expenses / revenue);
}

export interface TopExpenseRow {
  articleId: number;
  name: string;
  amount: number;
  previousAmount: number;
  /** Насколько выросло в рублях (отрицательное — упало). */
  growthAbs: number;
  /** Доля роста; null — когда в прошлом периоде расхода не было. */
  growthPct: number | null;
  /** Статья выросла больше чем на 20% — ТЗ просит подсветить. */
  isSharpGrowth: boolean;
  /** Расхода не было вовсе, а теперь есть. */
  isNew: boolean;
}

/** Порог подсветки из ТЗ: рост больше чем на 20%. */
export const SHARP_GROWTH_THRESHOLD = 0.2;

/**
 * Топ расходных статей с динамикой к прошлому периоду.
 *
 * Тонкое место — статья, которой в прошлом периоде не было. Делить на ноль
 * нечем, поэтому доля роста остаётся пустой, но подсветка ставится: новая
 * статья расходов — это ровно то, что человек должен заметить. Молча
 * приравнять её к «росту на 0%» значило бы спрятать её среди спокойных.
 */
export function buildTopExpenseArticles(
  current: ExpenseArticleRow[],
  previous: ExpenseArticleRow[],
  limit = 10,
): TopExpenseRow[] {
  const previousById = new Map<number, number>();
  previous
    .filter((row) => row.kind === 'expense')
    .forEach((row) => previousById.set(row.id, row.amount ?? 0));

  return current
    .filter((row) => row.kind === 'expense' && (row.amount ?? 0) !== 0)
    .map((row) => {
      const amount = round2(row.amount ?? 0);
      const previousAmount = round2(previousById.get(row.id) ?? 0);
      const growthAbs = round2(amount - previousAmount);
      const isNew = previousAmount === 0 && amount > 0;
      const growthPct =
        previousAmount > 0 ? round2(growthAbs / previousAmount) : null;

      return {
        articleId: row.id,
        name: row.name,
        amount,
        previousAmount,
        growthAbs,
        growthPct,
        isSharpGrowth:
          isNew || (growthPct != null && growthPct > SHARP_GROWTH_THRESHOLD),
        isNew,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
