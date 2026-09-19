import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import intl from 'react-intl-universal';
import { cn } from '@/lib/cn';
import { computeVirtualWindow } from './data-table';

/**
 * Движок отчётных таблиц (ОПиУ, Баланс, ДДС и т.п.) по стандарту «Простота Bigfin».
 *
 * Обычный <table> без react-table: иерархические строки с children,
 * сворачиваемые группы (по умолчанию развёрнуто до глубины 3 — как
 * defaultExpanderReducer в легаси), TOTAL-строки с верхней волосяной границей,
 * финальная строка — плашка bg-surface-elevated, минусы — спокойным серым.
 *
 * Формат данных повторяет ответ сервера FinancialStatements:
 * row = { id?, cells: [{ key, value }], row_types: string[], children?: row[] }.
 */

/** Типы строк, которые присылает сервер в row_types. */
export const ReportRowType = {
  /** Строка-счёт (лист). */
  Account: 'ACCOUNT',
  /** Группа счетов (узел с children). */
  Accounts: 'ACCOUNTS',
  /** Агрегирующая группа. */
  Aggregate: 'AGGREGATE',
  /** Итоговая строка (Валовая прибыль, Итого выручка и т.п.). */
  Total: 'TOTAL',
} as const;

export type ReportRowTypeValue =
  (typeof ReportRowType)[keyof typeof ReportRowType];

export interface ReportTableCell {
  key: string;
  value: string;
}

export interface ReportTableRow {
  id?: string | number;
  cells: ReportTableCell[];
  /** Сервер шлёт массив (например ['TOTAL']); допускаем и строку. */
  row_types?: string | string[];
  children?: ReportTableRow[];
}

export interface ReportTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  /** Индекс ячейки в row.cells (cell_index сервера). Fallback — поиск по key. */
  cellIndex?: number;
  /**
   * Колонка, которой нет в ответе отчёта: значение считает вызывающий
   * (план-факт — этап 4 ТЗ, п. 4.4). Пустая строка = прочерк в ячейке.
   */
  getValue?: (row: ReportTableRow) => string;
}

export interface ReportTableProps {
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  /** До какой глубины группы развёрнуты по умолчанию (как в легаси — 3). */
  defaultExpandedDepth?: number;
  /**
   * Прятать суммы развёрнутой группы (итог виден на строке TOTAL ниже) —
   * повторяет поведение легаси ReportDataTable (is-expanded → opacity 0).
   */
  hideValuesWhenExpanded?: boolean;
  /**
   * Финальная строка отчёта (Чистая прибыль) — плашка bg-surface-elevated.
   * По умолчанию — последняя строка верхнего уровня.
   */
  isFinalRow?: (row: ReportTableRow, rootIndex: number, rootCount: number) => boolean;
  /** Текст, когда строк нет («За выбранный период продаж не было»). */
  emptyText?: React.ReactNode;
  /**
   * Клик по строке отчёта: раскрытие суммы до операций (этап 4 ТЗ, п. 4.2).
   * Вызывается только для строк, которые вызывающий счёл раскрываемыми —
   * `canDrillDown`. Без него строка ведёт себя как раньше.
   */
  onRowClick?: (row: ReportTableRow) => void;
  /** Какие строки можно раскрыть: обычно это строки-счета, а не итоги. */
  canDrillDown?: (row: ReportTableRow) => boolean;
  /**
   * Виртуализация для длинных отчётов (Журнал, Главная книга):
   * рендерятся только видимые строки, высота строки фиксированная.
   */
  virtualized?: boolean;
  rowHeight?: number;
  overscan?: number;
  maxBodyHeight?: number;
  className?: string;
}

/** Приводит row_types к массиву строк. */
function toRowTypes(rowTypes: ReportTableRow['row_types']): string[] {
  if (!rowTypes) return [];
  return Array.isArray(rowTypes) ? rowTypes : [rowTypes];
}

/** Итоговая ли строка (TOTAL в row_types; сервер шлёт и 'TOTAL', и 'total'). */
export function isTotalRow(row: ReportTableRow): boolean {
  return toRowTypes(row.row_types).some(
    (type) => type.toUpperCase() === ReportRowType.Total,
  );
}

/** Значение ячейки строки для колонки: по cellIndex, затем по key, затем позиционно. */
export function getRowCellValue(
  row: ReportTableRow,
  column: ReportTableColumn,
  columnIndex: number,
): string {
  // Вычисляемая колонка важнее ячеек сервера: её в ответе отчёта нет.
  if (column.getValue) {
    return column.getValue(row) ?? '';
  }
  if (column.cellIndex != null) {
    return row.cells[column.cellIndex]?.value ?? '';
  }
  const byKey = row.cells.find((cell) => cell.key === column.key);
  if (byKey) return byKey.value ?? '';
  return row.cells[columnIndex]?.value ?? '';
}

/** Отрицательное значение? («-100», «−100», «(100)»). */
export function isNegativeValue(value: string): boolean {
  return /^\s*[-−(]/.test(value);
}

/**
 * Пути строк, развёрнутых по умолчанию до заданной глубины
 * (порт defaultExpanderReducer из @/utils на Set путей «0.1.2»).
 */
export function defaultExpandedPaths(
  rows: ReportTableRow[],
  depth: number,
): Set<string> {
  const expanded = new Set<string>();

  const walker = (
    nodes: ReportTableRow[],
    parentPath: string | null,
    currentLevel: number,
  ) => {
    nodes.forEach((node, index) => {
      const path = parentPath ? `${parentPath}.${index}` : `${index}`;
      expanded.add(path);

      if (node.children && node.children.length > 0 && currentLevel < depth) {
        walker(node.children, path, currentLevel + 1);
      }
    });
  };
  walker(rows, null, 1);

  return expanded;
}

/** Видимая строка после уплощения дерева с учётом развёрнутости групп. */
interface FlatVisibleRow {
  row: ReportTableRow;
  path: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isFinal: boolean;
}

/**
 * Уплощает дерево строк в список видимых (дети — только у развёрнутых групп).
 * Единый плоский рендер упрощает виртуализацию длинных отчётов.
 */
function flattenVisibleRows(
  rows: ReportTableRow[],
  expanded: Set<string>,
  isFinal: (row: ReportTableRow, rootIndex: number, rootCount: number) => boolean,
): FlatVisibleRow[] {
  const out: FlatVisibleRow[] = [];

  const walker = (
    nodes: ReportTableRow[],
    parentPath: string | null,
    depth: number,
  ) => {
    nodes.forEach((node, index) => {
      const path = parentPath ? `${parentPath}.${index}` : `${index}`;
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isExpanded = hasChildren && expanded.has(path);

      out.push({
        row: node,
        path,
        depth,
        hasChildren,
        isExpanded,
        isFinal: depth === 1 && isFinal(node, index, nodes.length),
      });
      if (isExpanded) walker(node.children!, path, depth + 1);
    });
  };
  walker(rows, null, 1);

  return out;
}

interface ReportRowViewProps {
  flat: FlatVisibleRow;
  columns: ReportTableColumn[];
  onToggle: (path: string) => void;
  hideValuesWhenExpanded: boolean;
  rowHeight?: number;
  onRowClick?: (row: ReportTableRow) => void;
  canDrillDown?: (row: ReportTableRow) => boolean;
}

function ReportRowView({
  flat,
  columns,
  onToggle,
  hideValuesWhenExpanded,
  rowHeight,
  onRowClick,
  canDrillDown,
}: ReportRowViewProps) {
  const { row, path, depth, hasChildren, isExpanded, isFinal } = flat;
  const isTotal = isTotalRow(row);
  const hideValues = hideValuesWhenExpanded && isExpanded;

  // Раскрывать до операций имеет смысл не у всякой строки: у итогов и
  // расчётных строк своих проводок нет.
  const drillable = Boolean(onRowClick && canDrillDown?.(row));

  return (
    <tr
      style={rowHeight ? { height: rowHeight } : undefined}
      onClick={drillable ? () => onRowClick?.(row) : undefined}
      className={cn(
        'border-b border-border/60',
        isTotal && 'border-t border-t-border font-semibold',
        isFinal && 'border-b-0 bg-surface-elevated font-semibold',
        drillable && 'cursor-pointer hover:bg-surface-elevated',
      )}
    >
        {columns.map((column, columnIndex) => {
          const isNameColumn = columnIndex === 0;
          const value = getRowCellValue(row, column, columnIndex);
          const negative = isNegativeValue(value);

          return (
            <td
              key={column.key}
              className={cn(
                'px-3 py-1.5 text-sm text-text-primary',
                column.align === 'right' &&
                  'text-right tabular-nums whitespace-nowrap',
                column.align === 'center' && 'text-center',
                !isNameColumn && negative && !isTotal && 'text-text-secondary',
              )}
              style={
                isNameColumn && depth > 1
                  ? { paddingLeft: `${12 + (depth - 1) * 20}px` }
                  : undefined
              }
            >
              {isNameColumn ? (
                <span className="inline-flex items-center gap-1">
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded
                          ? intl.get('report_table.aria.collapse_row')
                          : intl.get('report_table.aria.expand_row')
                      }
                      onClick={() => onToggle(path)}
                      className="-ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-text-muted hover:text-text-primary"
                    >
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          'h-3.5 w-3.5 transition-transform',
                          isExpanded && 'rotate-90',
                        )}
                      />
                    </button>
                  ) : (
                    depth > 1 && <span className="w-3 shrink-0" aria-hidden />
                  )}
                  <span>{value}</span>
                </span>
              ) : hideValues ? null : (
                value
              )}
            </td>
          );
        })}
    </tr>
  );
}

/**
 * Отчётная таблица: иерархия строк, сворачиваемые группы, итоги.
 */
export function ReportTable({
  columns,
  rows,
  defaultExpandedDepth = 3,
  hideValuesWhenExpanded = true,
  isFinalRow,
  emptyText,
  onRowClick,
  canDrillDown,
  virtualized = false,
  rowHeight = 32,
  overscan = 8,
  maxBodyHeight = 560,
  className,
}: ReportTableProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() =>
    defaultExpandedPaths(rows, defaultExpandedDepth),
  );

  // При смене данных отчёта (перезапрос с другим периодом/фильтром)
  // возвращаем развёртку к дефолту — как легаси, где expanded
  // пересчитывался useMemo от table.
  const prevRowsRef = React.useRef(rows);
  React.useEffect(() => {
    if (prevRowsRef.current !== rows) {
      prevRowsRef.current = rows;
      setExpanded(defaultExpandedPaths(rows, defaultExpandedDepth));
    }
  }, [rows, defaultExpandedDepth]);

  const handleToggle = React.useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const finalRowCheck =
    isFinalRow ??
    ((_row: ReportTableRow, rootIndex: number, rootCount: number) =>
      rootIndex === rootCount - 1);

  // Плоский список видимых строк (дети — только у развёрнутых групп).
  const flatVisible = React.useMemo(
    () => flattenVisibleRows(rows, expanded, finalRowCheck),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, expanded, isFinalRow],
  );

  const [scrollTop, setScrollTop] = React.useState(0);
  const vwin = virtualized
    ? computeVirtualWindow({
        scrollTop,
        viewportHeight: maxBodyHeight,
        rowHeight,
        rowCount: flatVisible.length,
        overscan,
      })
    : null;
  const visibleRows = vwin
    ? flatVisible.slice(vwin.startIndex, vwin.endIndex)
    : flatVisible;

  return (
    <div
      className={cn(
        virtualized ? 'overflow-auto' : 'overflow-x-auto',
        className,
      )}
      style={virtualized ? { maxHeight: maxBodyHeight } : undefined}
      onScroll={
        virtualized
          ? (e) => setScrollTop((e.currentTarget as HTMLElement).scrollTop)
          : undefined
      }
    >
      <table className="w-full border-collapse text-sm">
        <thead className={cn(virtualized && 'sticky top-0 z-10 bg-surface')}>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-3 py-2 text-left text-[0.8125rem] font-medium text-text-secondary',
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyText != null && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-sm text-text-secondary"
              >
                {emptyText}
              </td>
            </tr>
          )}
          {vwin && vwin.padTop > 0 && (
            <tr aria-hidden="true" style={{ height: vwin.padTop }}>
              <td colSpan={columns.length} className="p-0" />
            </tr>
          )}
          {visibleRows.map((flat) => (
            <ReportRowView
              key={flat.path}
              flat={flat}
              columns={columns}
              onToggle={handleToggle}
              hideValuesWhenExpanded={hideValuesWhenExpanded}
              rowHeight={virtualized ? rowHeight : undefined}
              onRowClick={onRowClick}
              canDrillDown={canDrillDown}
            />
          ))}
          {vwin && vwin.padBottom > 0 && (
            <tr aria-hidden="true" style={{ height: vwin.padBottom }}>
              <td colSpan={columns.length} className="p-0" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface ReportSheetProps {
  /** Название организации. */
  companyName?: React.ReactNode;
  /** Человеческий заголовок отчёта («Сколько бизнес заработал…»). */
  sheetType: React.ReactNode;
  /** Отформатированный период («За январь — март 2026»). */
  dateText?: React.ReactNode;
  /** Метод учёта: 'cash' | 'accrual' — подпись в подвале листа. */
  basis?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Шапка + подвал отчётного листа: заголовок по-человечески, период,
 * метод учёта. Внутрь кладётся <ReportTable />.
 */
export function ReportSheet({
  companyName,
  sheetType,
  dateText,
  basis,
  children,
  className,
}: ReportSheetProps) {
  const basisLabel =
    basis === 'cash'
      ? intl.get('cash')
      : basis === 'accrual'
        ? intl.get('accrual')
        : undefined;

  return (
    <div
      className={cn(
        'bigfin-ui rounded-default border border-border bg-surface p-6',
        className,
      )}
    >
      <div className="mb-5">
        {companyName && (
          <div className="text-[0.8125rem] text-text-muted">
            {companyName}
          </div>
        )}
        <h2 className="mt-1 text-xl font-semibold text-text-primary">
          {sheetType}
        </h2>
        {dateText && (
          <div className="mt-0.5 text-sm text-text-secondary">{dateText}</div>
        )}
      </div>

      {children}

      {basisLabel && (
        <div className="mt-4 text-xs text-text-muted">
          {intl.get('accounting_basis')} {basisLabel}
        </div>
      )}
    </div>
  );
}
