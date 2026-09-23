import type { ReportTableColumn } from '@/components/ui/report-table';

import type { MatrixServerRow } from './cashFlowArticlesMatrix';

/**
 * Ряды графика над отчётом «Деньги (ДДС по статьям)».
 *
 * ГЛАВНОЕ ТРЕБОВАНИЕ — «РЯД ГРАФИКА = ЧИСЛАМ ТАБЛИЦЫ». Оно выполняется
 * устройством, а не проверкой: график берёт числа из тех же строк, которые
 * рисует таблица. Второго источника нет, поэтому разойтись им не на чем.
 *
 * С матрицей (FT-001 ТЗ-3) график отвечает на вопрос «как деньги шли по
 * месяцам»: столбики поступлений и выплат по каждому периоду. Раньше он
 * показывал три раздела деятельности за весь период — ровно то, что и так
 * видно в первых строках таблицы.
 */

/** Точка графика: один период. */
export interface CashFlowPeriodPoint {
  key: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

/**
 * Ряды графика — по периодам, из тех же строк, что рисует таблица
 * (FT-001: «график строит ряды из периодов, а не из строк»).
 *
 * Второго запроса нет: второй источник тех же сумм однажды разошёлся бы с
 * таблицей, а расхождение картинки с цифрами дороже отсутствия картинки.
 * Выплаты идут положительным столбиком рядом с поступлениями — так их
 * сравнивают глазами.
 */
export function periodChartSeries(
  columns: ReportTableColumn[],
  rows: MatrixServerRow[] = [],
): CashFlowPeriodPoint[] {
  const periodColumns = columns.filter(
    (column, index) => index > 0 && column.key !== 'total',
  );
  const topLevel = rows ?? [];
  // «Поступления» и «Выплаты» лежат внутри разделов деятельности.
  const groups = topLevel.flatMap((row) => row.children ?? []);

  const cellOf = (row: MatrixServerRow, column: ReportTableColumn) =>
    Number(row.cells[column.cellIndex ?? -1]?.value ?? 0) || 0;
  const sum = (list: MatrixServerRow[], column: ReportTableColumn) =>
    list.reduce((total, row) => total + cellOf(row, column), 0);

  const inflows = groups.filter((row) => row.id?.startsWith('inflow-'));
  const outflows = groups.filter((row) => row.id?.startsWith('outflow-'));
  const net = topLevel.find((row) => row.id === 'net');

  return periodColumns.map((column) => ({
    key: column.key,
    label: column.label,
    inflow: round2(sum(inflows, column)),
    outflow: round2(sum(outflows, column)),
    net: net ? round2(cellOf(net, column)) : 0,
  }));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Есть ли что рисовать: пустой график с подписью «0» выглядит поломкой. */
export function hasPeriodMovement(series: CashFlowPeriodPoint[] = []): boolean {
  return (series ?? []).some((point) => point.inflow !== 0 || point.outflow !== 0);
}
