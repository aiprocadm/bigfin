import * as React from 'react';
// react-table v7 ships without type declarations and @types/react-table is not installed
// (no new deps). The legacy DataTable uses @ts-nocheck; we keep the rest of this file typed.
// @ts-ignore
import { useTable, useSortBy } from 'react-table';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import intl from 'react-intl-universal';
import { cn } from '@/lib/cn';
import { Checkbox } from './checkbox';
import { Skeleton } from './skeleton';

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  padTop: number;
  padBottom: number;
}

/**
 * Чистый расчёт окна виртуализации (фиксированная высота строки).
 * endIndex — полуоткрытый (для Array.slice).
 */
export function computeVirtualWindow(params: {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  rowCount: number;
  overscan: number;
}): VirtualWindow {
  const { scrollTop, viewportHeight, rowHeight, rowCount, overscan } = params;
  if (rowCount <= 0 || rowHeight <= 0) {
    return { startIndex: 0, endIndex: 0, padTop: 0, padBottom: 0 };
  }
  const first = Math.floor(scrollTop / rowHeight);
  const last = Math.ceil((scrollTop + viewportHeight) / rowHeight);
  const startIndex = Math.max(0, first - overscan);
  const endIndex = Math.min(rowCount, last + overscan);
  return {
    startIndex,
    endIndex,
    padTop: startIndex * rowHeight,
    padBottom: (rowCount - endIndex) * rowHeight,
  };
}

/** Минимальная ширина колонки в px (нельзя схлопнуть). */
export const MIN_COLUMN_WIDTH = 48;

/**
 * Чистое применение ресайза к map ширин колонок.
 * При отсутствующем columnId база = minWidth.
 */
export function applyColumnResize(
  widths: Record<string, number>,
  columnId: string,
  deltaPx: number,
  minWidth: number,
): Record<string, number> {
  const baseWidth = widths[columnId] ?? minWidth;
  const next = Math.max(minWidth, baseWidth + deltaPx);
  return { ...widths, [columnId]: next };
}

export interface DataTableProps {
  columns: any[];
  data: any[];
  getRowId: (row: any) => string;
  loading?: boolean;
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: any) => void;
  onSortChange?: (sortBy: { id: string; desc: boolean }[]) => void;
  emptyState?: React.ReactNode;
  /**
   * Как нарисовать строку НА ТЕЛЕФОНЕ.
   *
   * Таблица из шести столбцов на экране в 390 точек нечитаема: её можно
   * прокручивать вбок, но человек не видит целой строки и не может
   * сравнить две. Когда обработчик задан, на узком экране вместо таблицы
   * рисуется список — каждая запись отдельным блоком, где важное стоит
   * друг под другом.
   *
   * Не задан — остаётся прежняя прокручиваемая таблица: это хуже, но
   * работает, и ни один экран не ломается от того, что его ещё не
   * приспособили.
   */
  renderMobileRow?: (row: any) => React.ReactNode;
  // Виртуализация (опционально; выключена по умолчанию)
  virtualized?: boolean;
  rowHeight?: number;
  overscan?: number;
  maxBodyHeight?: number;
  // Ресайз колонок (опционально; выключен по умолчанию)
  resizableColumns?: boolean;
  columnWidths?: Record<string, number>;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
  // Древовидные строки (опционально; выключено по умолчанию).
  // Если задан getSubRows — virtualized игнорируется (вместе не поддерживаются).
  getSubRows?: (row: any) => any[] | undefined;
  defaultExpanded?: boolean;
  /**
   * Id колонки, в которой рисуется шеврон/отступ дерева.
   * По умолчанию — первая data-колонка (после selection, если она включена).
   */
  treeColumnId?: string;
}

/** Метаданные строки дерева (глубина, наличие детей, развёрнутость). */
interface TreeRowMeta {
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

export function DataTable({
  columns,
  data,
  getRowId,
  loading = false,
  enableSelection = false,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onSortChange,
  emptyState,
  renderMobileRow,
  virtualized = false,
  rowHeight = 40,
  overscan = 8,
  maxBodyHeight = 480,
  resizableColumns = false,
  columnWidths = {},
  onColumnWidthsChange,
  getSubRows,
  defaultExpanded = false,
  treeColumnId,
}: DataTableProps) {
  const [internalSel, setInternalSel] = React.useState<string[]>([]);
  const selected = selectedIds ?? internalSel;

  const setSelected = (ids: string[]) => {
    if (selectedIds === undefined) setInternalSel(ids);
    onSelectionChange?.(ids);
  };

  // --- Древовидные строки ---
  const treeEnabled = Boolean(getSubRows);
  // Дерево + виртуализация вместе не поддерживаются: при заданном getSubRows
  // виртуализация игнорируется (список строк меняется при сворачивании).
  const virtualizedEnabled = virtualized && !treeEnabled;

  // Храним не «развёрнутые» id, а «переключённые» относительно defaultExpanded:
  // так defaultExpanded=true работает и для данных, пришедших позже (async).
  const [toggledIds, setToggledIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const toggleExpanded = (id: string) =>
    setToggledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Плоский список видимых строк (dfs с учётом развёрнутости) + метаданные.
  // Без getSubRows возвращаем data как есть — поведение прежних потребителей
  // не меняется (тот же массив по ссылке, treeMeta = null).
  const { flatData, treeMeta } = React.useMemo((): {
    flatData: any[];
    treeMeta: Map<string, TreeRowMeta> | null;
  } => {
    if (!treeEnabled) return { flatData: data, treeMeta: null };
    const meta = new Map<string, TreeRowMeta>();
    const out: any[] = [];
    const walk = (nodes: any[], depth: number) => {
      for (const node of nodes) {
        const id = getRowId(node);
        const children = getSubRows?.(node);
        const hasChildren = Array.isArray(children) && children.length > 0;
        const expanded =
          hasChildren &&
          (defaultExpanded ? !toggledIds.has(id) : toggledIds.has(id));
        meta.set(id, { depth, hasChildren, expanded });
        out.push(node);
        if (expanded) walk(children as any[], depth + 1);
      }
    };
    walk(data, 0);
    return { flatData: out, treeMeta: meta };
  }, [treeEnabled, data, getRowId, getSubRows, defaultExpanded, toggledIds]);

  // Selection работает по всем ВИДИМЫМ строкам (для дерева — включая
  // развёрнутых детей, исключая свёрнутых).
  const allIds = React.useMemo(() => flatData.map(getRowId), [flatData, getRowId]);
  // Content-based (not length-based) so the header can't show "all selected"
  // when the selection actually holds ids from a different page.
  const allChecked =
    allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const someChecked =
    allIds.some((id) => selected.includes(id)) && !allChecked;

  const selectionColumn = React.useMemo(() => {
    // Defined inside the memo so they always close over the current
    // `selected`/`allIds` snapshot (no stale-closure gap).
    const toggleAll = (checked: boolean) => setSelected(checked ? allIds : []);
    const toggleRow = (id: string, checked: boolean) =>
      setSelected(
        checked ? [...selected, id] : selected.filter((x) => x !== id),
      );
    return {
      id: '__select__',
      disableSortBy: true,
      width: 40,
      Header: () => (
        <Checkbox
          aria-label={intl.get('data_table.aria.select_all')}
          checked={allChecked ? true : someChecked ? 'indeterminate' : false}
          onCheckedChange={(v: boolean | 'indeterminate') => toggleAll(v === true)}
        />
      ),
      Cell: ({ row }: any) => {
        const id = getRowId(row.original);
        return (
          <Checkbox
            aria-label={intl.get('data_table.aria.select_row')}
            checked={selected.includes(id)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onCheckedChange={(v: boolean | 'indeterminate') => toggleRow(id, v === true)}
          />
        );
      },
    };
  }, [allChecked, someChecked, selected, allIds, getRowId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tableColumns = React.useMemo(
    () => (enableSelection ? [selectionColumn, ...columns] : columns),
    [enableSelection, selectionColumn, columns],
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, state } =
    useTable(
      {
        columns: tableColumns,
        data: flatData,
        manualSortBy: true,
        // Сортировка идёт только через сервер (manualSortBy): без обработчика
        // onSortChange кликать по заголовку бессмысленно — данные не переупорядочатся.
        // Поэтому при отсутствии onSortChange гасим сортируемость всей таблицы,
        // чтобы не показывать «мёртвый» аффорданс (курсор/шеврон) на заголовках.
        disableSortBy: !onSortChange,
        autoResetSortBy: false,
        disableSortRemove: true,
      } as any,
      useSortBy,
    ) as any;

  const sortBy = state.sortBy;
  // Gate on content (react-table may hand back a fresh array ref each render).
  const sortByKey = JSON.stringify(sortBy ?? []);
  React.useEffect(() => {
    onSortChange?.(sortBy);
  }, [sortByKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [scrollTop, setScrollTop] = React.useState(0);
  const vwin =
    virtualizedEnabled && !loading
      ? computeVirtualWindow({
          scrollTop,
          viewportHeight: maxBodyHeight,
          rowHeight,
          rowCount: rows.length,
          overscan,
        })
      : null;
  const visibleRows = vwin ? rows.slice(vwin.startIndex, vwin.endIndex) : rows;

  const startColumnResize = React.useCallback(
    (e: React.MouseEvent, columnId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const thEl = (e.currentTarget as HTMLElement)
        .parentElement as HTMLElement | null;
      const startWidth =
        columnWidths[columnId] ?? thEl?.offsetWidth ?? MIN_COLUMN_WIDTH;
      const seeded = { ...columnWidths, [columnId]: startWidth };
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        onColumnWidthsChange?.(
          applyColumnResize(seeded, columnId, delta, MIN_COLUMN_WIDTH),
        );
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [columnWidths, onColumnWidthsChange],
  );

  if (!loading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // На телефоне — список блоков вместо таблицы, если экран это умеет.
  // Таблица остаётся в разметке для больших экранов: переключение чисто
  // на CSS, чтобы при повороте телефона ничего не перезагружалось.
  const mobileList = renderMobileRow ? (
    <div className="flex flex-col divide-y divide-border md:hidden">
      {loading
        ? [...Array(3)].map((_, i) => (
            <div key={`sk-m-${i}`} className="p-3">
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        : rows.map((row: any) => {
            prepareRow(row);

            return (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  'p-3',
                  onRowClick && 'cursor-pointer active:bg-surface-elevated',
                )}
              >
                {renderMobileRow(row.original)}
              </div>
            );
          })}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        'rounded-default border border-border bg-surface',
        virtualizedEnabled ? 'overflow-auto' : 'overflow-x-auto',
      )}
      style={virtualizedEnabled ? { maxHeight: maxBodyHeight } : undefined}
      onScroll={
        virtualizedEnabled
          ? (e) => setScrollTop((e.currentTarget as HTMLElement).scrollTop)
          : undefined
      }
    >
      {mobileList}

      <table
        {...getTableProps()}
        className={cn(
          'w-full border-collapse text-sm',
          // Когда есть мобильный вид, таблица прячется на узком экране.
          renderMobileRow && 'hidden md:table',
        )}
      >
        <thead
          className={cn(
            // Шапка отделяется ЛИНИЕЙ, а не заливкой: серая полоса поверх
            // страницы — ещё одна поверхность, которую глаз обязан разобрать.
            // При закреплённой шапке фон нужен непрозрачный, иначе сквозь неё
            // просвечивают строки.
            'border-b border-border',
            virtualizedEnabled && 'sticky top-0 z-10 bg-surface',
          )}
        >
          {headerGroups.map((hg: any) => (
            <tr {...hg.getHeaderGroupProps()}>
              {hg.headers.map((col: any) => (
                <th
                  {...col.getHeaderProps(
                    col.getSortByToggleProps ? col.getSortByToggleProps() : undefined,
                  )}
                  style={
                    resizableColumns && columnWidths[col.id] != null
                      ? { width: columnWidths[col.id] }
                      : undefined
                  }
                  className={cn(
                    // Заголовок колонки — обычным строчным письмом.
                    // ПРОПИСНЫЕ вразрядку кричат громче самих данных, ради
                    // которых таблица и нарисована, и читаются медленнее:
                    // у слова из прописных нет привычного глазу силуэта.
                    'relative px-3 py-2 text-left text-subhead font-medium text-text-secondary',
                    col.align === 'right' && 'text-right',
                    // col.canSort учитывает и колоночный disableSortBy, и табличный
                    // (выставляется выше при отсутствии onSortChange).
                    col.canSort && 'cursor-pointer select-none',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.render('Header')}
                    {col.isSorted &&
                      (col.isSortedDesc ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronUp className="h-3 w-3" />
                      ))}
                  </span>
                  {resizableColumns && col.id !== '__select__' && (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={intl.get('data_table.aria.resize_column')}
                      onMouseDown={(e) => startColumnResize(e, col.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-action"
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-border">
                  {tableColumns.map((_c, ci) => (
                    <td key={ci} className="px-3 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            : (
              <>
                {vwin && vwin.padTop > 0 && (
                  <tr aria-hidden="true" style={{ height: vwin.padTop }}>
                    <td colSpan={tableColumns.length} className="p-0" />
                  </tr>
                )}
                {visibleRows.map((row: any) => {
                  prepareRow(row);
                  const rowId = getRowId(row.original);
                  const rowMeta = treeMeta?.get(rowId);
                  return (
                    <tr
                      {...row.getRowProps()}
                      onClick={() => onRowClick?.(row.original)}
                      style={
                        virtualizedEnabled ? { height: rowHeight } : undefined
                      }
                      className={cn(
                        'border-t border-border',
                        onRowClick && 'cursor-pointer hover:bg-surface-elevated',
                      )}
                    >
                      {row.cells.map((cell: any, cellIndex: number) => {
                        // Шеврон/отступ дерева — в колонке treeColumnId, а при
                        // её отсутствии — в первой видимой data-колонке
                        // (после selection-колонки, если она включена).
                        const isTreeCell =
                          rowMeta != null &&
                          (treeColumnId != null
                            ? cell.column.id === treeColumnId
                            : cellIndex === (enableSelection ? 1 : 0));
                        return (
                          <td
                            {...cell.getCellProps()}
                            className={cn(
                              'px-3 py-2 text-text-primary',
                              cell.column.align === 'right' &&
                                'text-right tabular-nums whitespace-nowrap',
                            )}
                          >
                            {isTreeCell ? (
                              <span
                                className="flex items-center"
                                style={{ paddingLeft: rowMeta.depth * 20 }}
                              >
                                {rowMeta.hasChildren ? (
                                  <button
                                    type="button"
                                    aria-expanded={rowMeta.expanded}
                                    aria-label={intl.get(
                                      rowMeta.expanded
                                        ? 'data_table.aria.collapse_row'
                                        : 'data_table.aria.expand_row',
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpanded(rowId);
                                    }}
                                    className="mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-border"
                                  >
                                    {rowMeta.expanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : (
                                  <span
                                    className="mr-1 h-5 w-5 shrink-0"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="min-w-0 flex-1">
                                  {cell.render('Cell')}
                                </span>
                              </span>
                            ) : (
                              cell.render('Cell')
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {vwin && vwin.padBottom > 0 && (
                  <tr aria-hidden="true" style={{ height: vwin.padBottom }}>
                    <td colSpan={tableColumns.length} className="p-0" />
                  </tr>
                )}
              </>
            )}
        </tbody>
      </table>
    </div>
  );
}
