/**
 * Состав колонок план-факта (FIN-021 ТЗ-2).
 *
 * ЗАЧЕМ ВЫБОР. Четыре колонки рядом — это четыре числа про одно и то же, и
 * на телефоне они не помещаются. Кому-то нужен только факт, кому-то —
 * отклонение в процентах.
 *
 * ГЛАВНОЕ ПРАВИЛО: «ФАКТ» УПРАВЛЯЕТ ОСТАЛЬНЫМИ ТРЕМЯ. Выполнение плана,
 * отклонение и отклонение в процентах СЧИТАЮТСЯ ОТ ФАКТА. Показать их без
 * него значит показать следствие без причины: человек видит «−120 000» и не
 * видит, от чего это отклонение.
 *
 * Логика вынесена из экрана отдельно, потому что правило неочевидное и его
 * надо проверять спекой, а не глазами.
 */
export interface PlanFactColumns {
  /** Факт всегда можно снять — тогда остаётся один план. */
  fact: boolean;
  /** Выполнение плана, %. */
  completion: boolean;
  /** Отклонение в деньгах. */
  varianceAbs: boolean;
  /** Отклонение в процентах. */
  variancePct: boolean;
}

export const DEFAULT_PLAN_FACT_COLUMNS: PlanFactColumns = {
  fact: true,
  completion: false,
  varianceAbs: true,
  variancePct: true,
};

/** Колонки, зависящие от факта: без него они бессмысленны. */
export const FACT_DEPENDENT: Array<keyof PlanFactColumns> = [
  'completion',
  'varianceAbs',
  'variancePct',
];

/**
 * Можно ли сейчас включать колонку.
 *
 * @param {PlanFactColumns} columns текущий выбор
 * @param {keyof PlanFactColumns} column колонка
 * @returns {boolean}
 */
export function isColumnEnabled(
  columns: PlanFactColumns,
  column: keyof PlanFactColumns,
): boolean {
  if (column === 'fact') return true;

  return Boolean(columns.fact);
}

/**
 * Переключает колонку, соблюдая зависимость от факта.
 *
 * Снятие «Факта» СКРЫВАЕТ и отключает остальные три — не прячет их выбор, а
 * именно снимает: иначе человек вернёт факт и получит колонки, которых уже
 * не ждал.
 *
 * @param {PlanFactColumns} columns текущий выбор
 * @param {keyof PlanFactColumns} column какую переключаем
 * @returns {PlanFactColumns}
 */
export function togglePlanFactColumn(
  columns: PlanFactColumns,
  column: keyof PlanFactColumns,
): PlanFactColumns {
  if (column === 'fact') {
    const fact = !columns.fact;

    if (fact) return { ...columns, fact };

    return {
      fact: false,
      completion: false,
      varianceAbs: false,
      variancePct: false,
    };
  }

  // Зависимая колонка без факта не включается: показать следствие без
  // причины хуже, чем не показать вовсе.
  if (!columns.fact) return columns;

  return { ...columns, [column]: !columns[column] };
}

/** Сколько колонок сейчас показано, включая план и название. */
export function visibleColumnsCount(columns: PlanFactColumns): number {
  const extra = [
    columns.fact,
    columns.completion,
    columns.varianceAbs,
    columns.variancePct,
  ].filter(Boolean).length;

  // Название и план показываются всегда: без них таблица ни о чём.
  return 2 + extra;
}
