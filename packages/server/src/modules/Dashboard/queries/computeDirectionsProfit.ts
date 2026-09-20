// © 2026 Bigfin

/**
 * Прибыльность направлений (FIN-018 ТЗ-2).
 *
 * ЗАЧЕМ. Направление — это ярлык «розница», «опт», «объект на Ленина». Без
 * этого блока предприниматель узнаёт, что одно из них убыточно, только когда
 * открывает отчёт целиком, — а открывает он его редко.
 *
 * ЧЕГО НЕТ У КОНКУРЕНТА. ПланФакт рисует столбцы прибыли и линию
 * рентабельности. Здесь у убыточного направления стоит пометка словами:
 * график надо уметь читать, а слово «убыточно» читать не надо.
 *
 * ПОЧЕМУ УБЫТОК НЕ КРАСНЫЙ. Красный в продукте занят проблемами, которые
 * требуют действия сегодня (кассовый разрыв, просрочка). Убыточное
 * направление — это повод подумать, а не пожар. Красный на нём обесценил бы
 * красный там, где он настоящий.
 */

export interface DirectionAmounts {
  /** `null` — операции, на которых направление не указано. */
  projectId: number | null;
  name: string;
  /** Доходы за период, положительное число. */
  revenue: number;
  /** Расходы за период, положительное число. */
  costs: number;
}

export interface DirectionProfitRow extends DirectionAmounts {
  /** Выручка минус расходы; отрицательная — это убыток. */
  profit: number;
  /** Рентабельность, %. `null` — выручки нет, делить не на что. */
  marginPercent: number | null;
  /** Убыточно: витрина ставит рядом пометку словами. */
  isLoss: boolean;
}

export type DirectionsSortBy = 'profit' | 'margin';

export interface DirectionsProfitResult {
  rows: DirectionProfitRow[];
  /**
   * Операции без направления.
   *
   * Отдельной строкой, а не выброшены: иначе сумма блока не сойдётся с
   * отчётом о прибылях и убытках, и человек решит, что где-то ошибка.
   */
  unassigned: DirectionProfitRow | null;
  sortBy: DirectionsSortBy;
}

/** Сколько направлений показывает блок главной. */
export const DIRECTIONS_TOP = 8;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Считает прибыль и рентабельность по направлениям.
 *
 * @param {DirectionAmounts[]} directions доходы и расходы за период
 * @param {DirectionsSortBy} sortBy порядок: по прибыли или по рентабельности
 * @returns {DirectionsProfitResult}
 */
export function computeDirectionsProfit(
  directions: DirectionAmounts[] = [],
  sortBy: DirectionsSortBy = 'profit',
): DirectionsProfitResult {
  const rows = (directions ?? [])
    // Направление без движения за период пропускаем: строка с нулями ничего
    // не сообщает, а список удлиняет.
    .filter(
      (item) =>
        Number(item?.revenue ?? 0) !== 0 || Number(item?.costs ?? 0) !== 0,
    )
    .map((item) => toRow(item));

  const unassigned = rows.find((row) => row.projectId == null) ?? null;
  const named = rows.filter((row) => row.projectId != null);

  return {
    rows: sortRows(named, sortBy).slice(0, DIRECTIONS_TOP),
    unassigned,
    sortBy,
  };
}

function toRow(item: DirectionAmounts): DirectionProfitRow {
  const revenue = round2(Number(item.revenue ?? 0));
  const costs = round2(Number(item.costs ?? 0));
  const profit = round2(revenue - costs);

  return {
    projectId: item.projectId ?? null,
    name: item.name ?? '',
    revenue,
    costs,
    profit,
    // БЕЗ ВЫРУЧКИ РЕНТАБЕЛЬНОСТЬ НЕ СЧИТАЕТСЯ. Ноль вместо «н/о» — это
    // выдуманное число, по которому человек примет решение.
    marginPercent: revenue > 0 ? round2((profit / revenue) * 100) : null,
    isLoss: profit < 0,
  };
}

/**
 * Порядок строк.
 *
 * Два вопроса — два порядка. «Где больше всего денег» и «где лучше отдача» —
 * это не одно и то же: большое направление может давать много при плохой
 * рентабельности.
 *
 * Строки без рентабельности уходят вниз: «н/о» — это неизвестность, а не
 * бесконечность, и наверху ей не место.
 */
function sortRows(
  rows: DirectionProfitRow[],
  sortBy: DirectionsSortBy,
): DirectionProfitRow[] {
  if (sortBy === 'margin') {
    return [...rows].sort((left, right) => {
      if (left.marginPercent === null && right.marginPercent === null) return 0;
      if (left.marginPercent === null) return 1;
      if (right.marginPercent === null) return -1;

      return right.marginPercent - left.marginPercent;
    });
  }

  return [...rows].sort((left, right) => right.profit - left.profit);
}
