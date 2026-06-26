import * as React from 'react';
// react-table v7 ships without type declarations and @types/react-table is not installed
// (no new deps). The legacy DataTable uses @ts-nocheck; we keep the rest of this file typed.
// @ts-ignore
import { useTable, useSortBy } from 'react-table';
import { ChevronUp, ChevronDown } from 'lucide-react';
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
  // Виртуализация (опционально; выключена по умолчанию)
  virtualized?: boolean;
  rowHeight?: number;
  overscan?: number;
  maxBodyHeight?: number;
  // Ресайз колонок (опционально; выключен по умолчанию)
  resizableColumns?: boolean;
  columnWidths?: Record<string, number>;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
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
  virtualized = false,
  rowHeight = 40,
  overscan = 8,
  maxBodyHeight = 480,
  resizableColumns = false,
  columnWidths = {},
  onColumnWidthsChange,
}: DataTableProps) {
  const [internalSel, setInternalSel] = React.useState<string[]>([]);
  const selected = selectedIds ?? internalSel;

  const setSelected = (ids: string[]) => {
    if (selectedIds === undefined) setInternalSel(ids);
    onSelectionChange?.(ids);
  };

  const allIds = React.useMemo(() => data.map(getRowId), [data, getRowId]);
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
          aria-label="select-all"
          checked={allChecked ? true : someChecked ? 'indeterminate' : false}
          onCheckedChange={(v: boolean | 'indeterminate') => toggleAll(v === true)}
        />
      ),
      Cell: ({ row }: any) => {
        const id = getRowId(row.original);
        return (
          <Checkbox
            aria-label="select-row"
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
        data,
        manualSortBy: true,
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
    virtualized && !loading
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

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface',
        virtualized ? 'overflow-auto' : 'overflow-x-auto',
      )}
      style={virtualized ? { maxHeight: maxBodyHeight } : undefined}
      onScroll={
        virtualized
          ? (e) => setScrollTop((e.currentTarget as HTMLElement).scrollTop)
          : undefined
      }
    >
      <table {...getTableProps()} className="w-full border-collapse text-sm">
        <thead
          className={cn(
            'bg-surface-elevated',
            virtualized && 'sticky top-0 z-10',
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
                    'relative px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary',
                    col.align === 'right' && 'text-right',
                    !col.disableSortBy && 'cursor-pointer select-none',
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
                      aria-label="resize-column"
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
                  return (
                    <tr
                      {...row.getRowProps()}
                      onClick={() => onRowClick?.(row.original)}
                      style={virtualized ? { height: rowHeight } : undefined}
                      className={cn(
                        'border-t border-border',
                        onRowClick && 'cursor-pointer hover:bg-surface-elevated',
                      )}
                    >
                      {row.cells.map((cell: any) => (
                        <td
                          {...cell.getCellProps()}
                          className={cn(
                            'px-3 py-2 text-text-primary',
                            cell.column.align === 'right' &&
                              'text-right tabular-nums whitespace-nowrap',
                          )}
                        >
                          {cell.render('Cell')}
                        </td>
                      ))}
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
