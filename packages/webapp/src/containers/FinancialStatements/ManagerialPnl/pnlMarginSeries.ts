/**
 * Рентабельность по ярусам во времени (C9, этап 49 ТЗ-4): ряды МД %, ВП2 %,
 * ОП %, ЧП % по колонкам отчёта. Числа — те, что сервер уже отдал в строках
 * «Рентабельность: …»; своего расчёта нет.
 *
 * Пустая ячейка сервера — «не определено» (выручки нет): точка `null`, линия
 * рвётся, а не падает в ноль.
 */
export const MARGIN_SERIES = ['md_margin', 'gp2_margin', 'op_margin', 'np_margin'] as const;
export type MarginSeriesKey = (typeof MARGIN_SERIES)[number];

export type MarginPoint = { label: string } & Record<MarginSeriesKey, number | null>;

interface Row {
  id?: string;
  cells: Array<{ key?: string; value: string }>;
}
interface Column {
  key: string;
  label?: string;
  isTotal?: boolean;
  is_total?: boolean;
  cellIndex?: number;
}

export function pnlMarginSeries(rows: Row[] = [], columns: Column[] = []): MarginPoint[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  // Первая колонка — названия строк, «Итого» — не точка во времени.
  return columns
    .map((column, index) => ({ column, index }))
    .filter(({ column, index }) => index > 0 && !(column.isTotal ?? column.is_total))
    .map(({ column, index }) => {
      const cellIndex = column.cellIndex ?? index;
      const point = { label: column.label ?? column.key } as MarginPoint;
      MARGIN_SERIES.forEach((key) => {
        const raw = byId.get(key)?.cells[cellIndex]?.value;
        const value = raw === '' || raw === undefined || raw === null ? NaN : Number(raw);
        point[key] = Number.isFinite(value) ? value : null;
      });
      return point;
    });
}

/** Есть ли что рисовать: хотя бы две точки с числом у любого ряда. */
export const hasMarginSeries = (points: MarginPoint[]) =>
  MARGIN_SERIES.some((key) => points.filter((point) => point[key] !== null).length >= 2);
