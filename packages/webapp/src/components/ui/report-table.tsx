import * as React from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';
import intl from 'react-intl-universal';
import { cn } from '@/lib/cn';
import { computeVirtualWindow } from './data-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

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
  /**
   * Вторая строка под суммой — например, доля от итога колонки (FT-003
   * ТЗ-3). Мелко и спокойным цветом: главное в ячейке — сумма.
   */
  note?: string;
}

export interface ReportTableRow {
  id?: string | number;
  cells: ReportTableCell[];
  /** Сервер шлёт массив (например ['TOTAL']); допускаем и строку. */
  row_types?: string | string[];
  children?: ReportTableRow[];
  /**
   * Подсказка к названию строки: формула и смысл (FT-016 ТЗ-3). Рядом с
   * названием появляется «?».
   */
  hint?: string;
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
  /**
   * Колонка, которая рисует не текст, а разметку — например тонкую линию
   * тренда (T-38 ТЗ-2). `null` — ячейка пустая.
   *
   * Отдельно от `getValue` НАМЕРЕННО: значение-строку выравнивают,
   * красят по знаку и ищут поиском, а разметку — нет.
   */
  render?: (row: ReportTableRow) => React.ReactNode;
  /**
   * Подсветить колонку — например, выходной при масштабе «по дням»
   * (FT-006b ТЗ-3). Спокойный фон, а не цвет: выходной не проблема.
   */
  highlight?: boolean;
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
   * Щелчок по ОДНОЙ ячейке (FT-004 ТЗ-3). В матрице по месяцам раскрывать
   * надо сумму кликнутой колонки, а не всей строки: человек щёлкнул по
   * «Аренда · март» и ждёт мартовские платежи.
   */
  onCellClick?: (row: ReportTableRow, column: ReportTableColumn) => void;
  /** Какие ячейки раскрываются. Без него — ни одна. */
  canDrillDownCell?: (
    row: ReportTableRow,
    column: ReportTableColumn,
  ) => boolean;
  /**
   * Виртуализация для длинных отчётов (Журнал, Главная книга):
   * рендерятся только видимые строки, высота строки фиксированная.
   */
  virtualized?: boolean;
  rowHeight?: number;
  overscan?: number;
  maxBodyHeight?: number;
  /**
   * Шапка остаётся на месте при прокрутке вниз — и БЕЗ виртуализации
   * (FT-005b ТЗ-3). Таблица получает свою высоту и прокручивается внутри:
   * иначе прилипать шапке не к чему.
   */
  stickyHeader?: boolean;
  /**
   * Первая колонка (название строки) остаётся на месте при прокрутке вбок
   * (FT-005b). Без неё в матрице на двенадцать месяцев человек видит числа,
   * но уже не видит, к какой статье они относятся.
   */
  stickyFirstColumn?: boolean;
  /**
   * Строка, которую надо выделить: человек пришёл по ссылке «эта статья в
   * отчёте» и должен сразу увидеть, куда смотреть.
   */
  highlightRowId?: string;
  className?: string;
}

/**
 * Классы закреплённой первой колонки.
 *
 * Фон обязателен: без него числа, уезжающие под колонку, просвечивают
 * сквозь название. Тень вместо рамки — рамка у закреплённой ячейки при
 * `border-collapse` уезжает вместе с соседями.
 */
export const STICKY_FIRST_COLUMN_CLASS =
  'sticky left-0 shadow-[inset_-1px_0_0_var(--color-border)]';

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

/** Вторая строка ячейки — только у ячеек из ответа, не у вычисляемых колонок. */
export function getRowCellNote(
  row: ReportTableRow,
  column: ReportTableColumn,
  columnIndex: number,
): string | undefined {
  if (column.getValue || column.render) return undefined;
  if (column.cellIndex != null) return row.cells[column.cellIndex]?.note;
  const byKey = row.cells.find((cell) => cell.key === column.key);
  return (byKey ?? row.cells[columnIndex])?.note;
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
  onCellClick?: ReportTableProps['onCellClick'];
  canDrillDownCell?: ReportTableProps['canDrillDownCell'];
  stickyFirstColumn?: boolean;
  isHighlighted?: boolean;
}

function ReportRowView({
  flat,
  columns,
  onToggle,
  hideValuesWhenExpanded,
  rowHeight,
  onRowClick,
  canDrillDown,
  onCellClick,
  canDrillDownCell,
  stickyFirstColumn,
  isHighlighted,
}: ReportRowViewProps) {
  const { row, path, depth, hasChildren, isExpanded, isFinal } = flat;
  const isTotal = isTotalRow(row);
  const hideValues = hideValuesWhenExpanded && isExpanded;

  // Раскрывать до операций имеет смысл не у всякой строки: у итогов и
  // расчётных строк своих проводок нет.
  const drillable = Boolean(onRowClick && canDrillDown?.(row));

  return (
    <tr
      data-row-id={row.id != null ? String(row.id) : undefined}
      style={rowHeight ? { height: rowHeight } : undefined}
      onClick={drillable ? () => onRowClick?.(row) : undefined}
      className={cn(
        'border-b border-border/60',
        isTotal && 'border-t border-t-border font-semibold',
        isFinal && 'border-b-0 bg-surface-elevated font-semibold',
        drillable && 'group cursor-pointer hover:bg-surface-elevated',
        isHighlighted && 'bg-action/10',
      )}
    >
        {columns.map((column, columnIndex) => {
          const isNameColumn = columnIndex === 0;
          const value = getRowCellValue(row, column, columnIndex);
          const note = isNameColumn
            ? undefined
            : getRowCellNote(row, column, columnIndex);
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
                column.highlight && 'bg-surface-elevated/60',
                isNameColumn &&
                  stickyFirstColumn && [
                    STICKY_FIRST_COLUMN_CLASS,
                    'z-[1]',
                    isHighlighted
                      ? 'bg-[color-mix(in_srgb,var(--color-action)_10%,var(--color-surface))]'
                      : isFinal
                        ? 'bg-surface-elevated'
                        : 'bg-surface',
                    drillable && 'group-hover:bg-surface-elevated',
                  ],
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
                  {row.hint ? <RowHint text={row.hint} label={value} /> : null}
                </span>
              ) : hideValues ? null : column.render ? (
                column.render(row)
              ) : onCellClick && canDrillDownCell?.(row, column) ? (
                // Кнопка, а не щелчок по ячейке: так её видно клавиатуре и
                // экранному чтецу, и понятно, что число раскрывается.
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCellClick(row, column);
                  }}
                  className="rounded tabular-nums underline-offset-2 hover:underline focus-visible:underline"
                >
                  {value}
                </button>
              ) : (
                value
              )}
              {note && !hideValues ? (
                <div className="text-[0.6875rem] leading-tight text-text-muted">
                  {note}
                </div>
              ) : null}
            </td>
          );
        })}
    </tr>
  );
}

/** «?» у названия строки: формула по наведению и по нажатию (FT-016). */
function RowHint({ text, label }: { text: string; label: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${label}: ${text}`}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-text-muted hover:text-text-primary"
          >
            <HelpCircle aria-hidden className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-snug">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  onCellClick,
  canDrillDownCell,
  stickyHeader = false,
  stickyFirstColumn = false,
  highlightRowId,
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

  // Своя высота нужна и виртуализации, и прилипающей шапке: шапка
  // прилипает к краю того, что прокручивается, а не к окну браузера.
  const scrollsInside = virtualized || stickyHeader;

  return (
    <div
      className={cn(
        scrollsInside ? 'overflow-auto' : 'overflow-x-auto',
        className,
      )}
      style={scrollsInside ? { maxHeight: maxBodyHeight } : undefined}
      onScroll={
        virtualized
          ? (e) => setScrollTop((e.currentTarget as HTMLElement).scrollTop)
          : undefined
      }
    >
      <table className="w-full border-collapse text-sm">
        <thead
          className={cn(scrollsInside && 'sticky top-0 z-10 bg-surface')}
        >
          <tr className="border-b border-border">
            {columns.map((column, columnIndex) => (
              <th
                key={column.key}
                className={cn(
                  'px-3 py-2 text-left text-[0.8125rem] font-medium text-text-secondary',
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                  column.highlight && 'bg-surface-elevated',
                  // Угол: закреплён и сверху, и слева — поверх всех ячеек.
                  columnIndex === 0 &&
                    stickyFirstColumn && [
                      STICKY_FIRST_COLUMN_CLASS,
                      // Ширина задаётся шапкой: без неё колонка названий
                      // сжималась, и «Операционная деятельность» ломалась
                      // на две строки (живая проверка этапа 30).
                      'z-20 min-w-[15rem] bg-surface',
                    ],
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
              onCellClick={onCellClick}
              canDrillDownCell={canDrillDownCell}
              stickyFirstColumn={stickyFirstColumn}
              isHighlighted={
                highlightRowId != null && String(flat.row.id) === highlightRowId
              }
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
