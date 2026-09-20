// © 2026 Bigfin

/**
 * Темп исполнения бюджета (FIN-022 ТЗ-2).
 *
 * ЗАЧЕМ. «Выполнено 56 %» само по себе не значит ничего: в июле это хорошо,
 * в декабре — беда. Сравнивать выполнение надо с ПРОШЕДШИМ ВРЕМЕНЕМ.
 *
 * ЧЕГО НЕТ У КОНКУРЕНТА. ПланФакт показывает два числа рядом и оставляет
 * человека сравнивать их самому. Здесь есть ещё и вывод словами: «расходы
 * идут быстрее плана — потрачено 77 % при прошедших 60 % времени». Два
 * процента рядом читаются не всеми; фраза — всеми.
 */

export type BudgetPaceVerdict =
  | 'ON_TRACK'
  | 'SPENDING_FASTER'
  | 'SPENDING_SLOWER'
  | 'INCOME_AHEAD'
  | 'INCOME_BEHIND';

export interface BudgetPace {
  elapsedDays: number;
  totalDays: number;
  /** Доля прошедшего времени, 0…1. */
  elapsedRatio: number;
  /** Доля исполнения; `null` — план нулевой, делить не на что. */
  completionRatio: number | null;
  verdict: BudgetPaceVerdict | null;
}

/**
 * Насколько выполнение может разойтись со временем, оставаясь «по плану».
 *
 * Пять процентов — не круглое число ради красоты: без допуска вердикт
 * менялся бы каждый день на ровном месте, и человек перестал бы его читать.
 */
export const PACE_TOLERANCE = 0.05;

const DAY_MS = 86_400_000;

const dayCount = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      DAY_MS,
  ) + 1;

/**
 * Считает темп исполнения бюджета.
 *
 * @param {object} input период бюджета, план и факт
 * @param {string} today сегодня, `YYYY-MM-DD` — параметром, чтобы проверять
 *   поведение на фиксированной дате, а не зависеть от дня прогона
 * @returns {BudgetPace}
 */
export function computeBudgetPace(
  input: {
    fromDate: string;
    toDate: string;
    /** Плановая сумма за период. */
    planned: number;
    /** Фактическая сумма за период. */
    actual: number;
    /** Бюджет доходов или расходов: вердикты у них зеркальные. */
    kind?: 'income' | 'expense';
  },
  today: string,
): BudgetPace {
  const totalDays = Math.max(1, dayCount(input.fromDate, input.toDate));

  // Прошедшее время считается по минимуму из «сегодня» и конца периода:
  // у завершившегося бюджета прошло ровно сто процентов, а не больше.
  const lastCountedDay = today < input.toDate ? today : input.toDate;
  const elapsedDays =
    today < input.fromDate
      ? 0
      : Math.min(totalDays, Math.max(0, dayCount(input.fromDate, lastCountedDay)));

  const elapsedRatio = Math.round((elapsedDays / totalDays) * 10000) / 10000;

  const planned = Number(input.planned ?? 0);
  const actual = Number(input.actual ?? 0);

  // НУЛЕВОЙ ПЛАН НЕ ДАЁТ ДОЛИ. Ноль читался бы как «ничего не потрачено»,
  // а бесконечность — вообще не число. Витрина печатает такое как «н/о».
  const completionRatio =
    planned === 0 ? null : Math.round((actual / planned) * 10000) / 10000;

  return {
    elapsedDays,
    totalDays,
    elapsedRatio,
    completionRatio,
    verdict: verdictOf(completionRatio, elapsedRatio, input.kind ?? 'expense'),
  };
}

/**
 * Вывод словами.
 *
 * Расход и доход зеркальны: потратить больше времени — плохо, заработать
 * больше времени — хорошо. Один и тот же перекос значит разное, и назвать
 * его одинаково значило бы сбить человека с толку.
 */
function verdictOf(
  completionRatio: number | null,
  elapsedRatio: number,
  kind: 'income' | 'expense',
): BudgetPaceVerdict | null {
  if (completionRatio === null) return null;

  const diff = completionRatio - elapsedRatio;

  if (Math.abs(diff) <= PACE_TOLERANCE) return 'ON_TRACK';

  if (kind === 'expense') {
    return diff > 0 ? 'SPENDING_FASTER' : 'SPENDING_SLOWER';
  }

  return diff > 0 ? 'INCOME_AHEAD' : 'INCOME_BEHIND';
}
