// © 2026 Bigfin
/**
 * Сводка «план и факт» над таблицей ДДС (этап 4 ТЗ, п. 4.4).
 *
 * Почему сводка, а не колонки, как в ОПиУ. Отчёт о движении денег построен
 * косвенным методом: его строки — балансовые счета (дебиторка, запасы,
 * кредиторка, основные средства). Бюджет движения денег разложен по статьям
 * вида «выручка», «аренда», «зарплата» — то есть по доходно-расходным счетам.
 * Пересечения между этими наборами нет: приписать план строке «Запасы»
 * не к чему.
 *
 * Поэтому план и факт показываются там, где они сходятся честно — двумя
 * итогами: сколько денег планировали получить и потратить, и сколько
 * получили и потратили на самом деле.
 */

import type { PlanFactData, PlanFactSide } from './planFactColumns';

export interface PlanFactSummaryRow {
  /** 'income' — поступления, 'expense' — выплаты. */
  side: 'income' | 'expense';
  /** Ключ подписи строки в словаре. */
  labelKey: string;
  plan: number;
  fact: number;
  varianceAbs: number;
  variancePct: number | null;
}

const SIDE_LABEL_KEY: Record<'income' | 'expense', string> = {
  income: 'reports.plan_fact.money_in',
  expense: 'reports.plan_fact.money_out',
};

/** Есть ли в стороне хоть что-то, что стоит показывать. */
const isEmptySide = (side: PlanFactSide | undefined): boolean =>
  !side || (side.plan === 0 && side.fact === 0);

/**
 * Строки сводки. Пусто — когда бюджета нет или он пуст: сводка из нулей
 * утверждала бы, что ничего не планировали и ничего не случилось.
 */
export function planFactSummaryRows(
  data: PlanFactData | undefined,
): PlanFactSummaryRow[] {
  if (!data?.available) return [];

  const sides: Array<'income' | 'expense'> = ['income', 'expense'];

  return sides
    .filter((side) => !isEmptySide(data.totals?.[side]))
    .map((side) => {
      const totals = data.totals[side];
      return {
        side,
        labelKey: SIDE_LABEL_KEY[side],
        plan: totals.plan,
        fact: totals.fact,
        varianceAbs: totals.varianceAbs,
        variancePct: totals.variancePct,
      };
    });
}

/**
 * Хорошо это или плохо.
 *
 * У поступлений хорошо — получить больше плана, у выплат — потратить меньше.
 * Одинаковая раскраска по знаку числа красила бы перерасход зелёным.
 */
export function isVarianceGood(
  side: 'income' | 'expense',
  varianceAbs: number,
): boolean | null {
  if (varianceAbs === 0) return null;
  return side === 'income' ? varianceAbs > 0 : varianceAbs < 0;
}
