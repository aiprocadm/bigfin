/**
 * Строки отчёта «Деньги (ДДС по статьям)» — подготовка к показу (FIN-013).
 *
 * Вынесено из компонента, чтобы проверялось без браузера: здесь живут два
 * правила, которые легко сломать незаметно — что раскрывать по умолчанию и
 * какие строки выделять как итоговые.
 */

export interface ReportTableCell {
  key: string;
  value: string;
}

export interface ReportTableRow {
  id?: string;
  cells: ReportTableCell[];
  rowTypes?: string[];
  children?: ReportTableRow[];
}

export interface FlatReportRow {
  id: string;
  name: string;
  /** `null` — суммы у строки нет (заголовок). */
  amount: number | null;
  level: number;
  rowType: string;
  hasChildren: boolean;
}

/** Строки-итоги: выделяются начертанием и не сворачиваются. */
export const TOTAL_ROW_TYPES = [
  'OPENING',
  'CLOSING',
  'NET',
  'UNCLASSIFIED',
] as const;

/**
 * Что раскрыто при открытии отчёта.
 *
 * Разделы и группы «Поступления / Выплаты» — да: иначе человек видит три
 * строки и думает, что отчёт пустой. Дерево статей — нет: у организации их
 * бывают десятки, и разворачивать всё сразу значит показать простыню вместо
 * ответа.
 */
export const DEFAULT_EXPANDED_ROW_TYPES = [
  'SECTION',
  'INFLOW',
  'OUTFLOW',
  'TRANSFERS',
] as const;

const cellValue = (row: ReportTableRow, key: string): string =>
  row.cells?.find((cell) => cell.key === key)?.value ?? '';

const parseAmount = (raw: string): number | null => {
  if (raw === '' || raw === null || raw === undefined) return null;
  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
};

/**
 * Разворачивает дерево строк в плоский список с уровнями.
 *
 * Свёрнутая строка отдаёт себя, но не детей: так таблица рисует ровно то,
 * что видно, и не платит за скрытое.
 */
export function flattenReportRows(
  rows: ReportTableRow[] = [],
  expanded: Set<string>,
  level = 0,
): FlatReportRow[] {
  return (rows ?? []).flatMap((row, index) => {
    const id = row.id ?? `row-${level}-${index}`;
    const children = row.children ?? [];
    const self: FlatReportRow = {
      id,
      name: cellValue(row, 'name'),
      amount: parseAmount(cellValue(row, 'amount')),
      level,
      rowType: row.rowTypes?.[0] ?? 'ROW',
      hasChildren: children.length > 0,
    };

    if (children.length === 0 || !expanded.has(id)) return [self];

    return [self, ...flattenReportRows(children, expanded, level + 1)];
  });
}

/** Идентификаторы строк, раскрытых при первом показе. */
export function defaultExpandedIds(rows: ReportTableRow[] = []): Set<string> {
  const ids = new Set<string>();
  const walk = (list: ReportTableRow[], level: number) => {
    list.forEach((row, index) => {
      const id = row.id ?? `row-${level}-${index}`;
      const rowType = row.rowTypes?.[0] ?? '';

      if ((DEFAULT_EXPANDED_ROW_TYPES as readonly string[]).includes(rowType)) {
        ids.add(id);
      }
      walk(row.children ?? [], level + 1);
    });
  };
  walk(rows ?? [], 0);

  return ids;
}

/** Итоговая ли это строка — её показывают жирным и не сворачивают. */
export const isTotalRow = (rowType: string): boolean =>
  (TOTAL_ROW_TYPES as readonly string[]).includes(rowType);
