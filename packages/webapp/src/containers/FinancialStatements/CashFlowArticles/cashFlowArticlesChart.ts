import { FlatReportRow } from './cashFlowArticlesRows';

/**
 * Ряд графика над отчётом «Деньги (ДДС по статьям)» (T-14 ТЗ-2).
 *
 * ГЛАВНОЕ ТРЕБОВАНИЕ — «РЯД ГРАФИКА = ИТОГАМ ТАБЛИЦЫ ЗА ПЕРИОД». Оно
 * выполняется здесь НЕ проверкой, а устройством: график берёт числа из тех
 * же строк, которые рисует таблица. Второго источника нет, поэтому
 * разойтись им не на чем.
 *
 * ЧЕГО ЗДЕСЬ НЕТ. Отдельного запроса за данными графика. Он был бы вторым
 * источником тех же сумм — ровно то, что прежнее ТЗ запретило прямо: «второго
 * способа считать те же суммы быть не должно».
 */
export interface CashFlowChartPoint {
  /** Название раздела — как в таблице. */
  name: string;
  /** Итог раздела: приток минус отток. */
  amount: number;
}

/** Виды строк, которые попадают на график. */
const SECTION_ROW_TYPE = 'SECTION';

/**
 * Собирает ряд графика из строк таблицы.
 *
 * Берутся ТОЛЬКО разделы (операционная, инвестиционная, финансовая
 * деятельность): график отвечает на вопрос «откуда взялось движение
 * денег», а не перечисляет статьи. Строки без суммы — заголовки, им на
 * графике места нет.
 *
 * @param {FlatReportRow[]} rows плоские строки таблицы
 * @returns {CashFlowChartPoint[]}
 */
export function cashFlowChartSeries(
  rows: FlatReportRow[] = [],
): CashFlowChartPoint[] {
  return (rows ?? [])
    .filter((row) => row.rowType === SECTION_ROW_TYPE)
    .filter((row) => row.amount !== null)
    .map((row) => ({ name: row.name, amount: Number(row.amount) }));
}

/**
 * Есть ли что рисовать.
 *
 * Пустой график с подписью «0» выглядит поломкой, а не ответом «движения за
 * период не было».
 *
 * @param {CashFlowChartPoint[]} series ряд графика
 * @returns {boolean}
 */
export function hasChartMovement(series: CashFlowChartPoint[] = []): boolean {
  return (series ?? []).some((point) => point.amount !== 0);
}
