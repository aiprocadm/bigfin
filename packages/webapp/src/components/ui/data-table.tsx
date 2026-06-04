import * as React from 'react';
// react-table v7 ships without type declarations and @types/react-table is not installed
// (no new deps). The legacy DataTable uses @ts-nocheck; we keep the rest of this file typed.
// @ts-ignore
import { useTable, useSortBy } from 'react-table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Checkbox } from './checkbox';
import { Skeleton } from './skeleton';

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

  if (!loading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table {...getTableProps()} className="w-full border-collapse text-sm">
        <thead className="bg-surface-elevated">
          {headerGroups.map((hg: any) => (
            <tr {...hg.getHeaderGroupProps()}>
              {hg.headers.map((col: any) => (
                <th
                  {...col.getHeaderProps(
                    col.getSortByToggleProps ? col.getSortByToggleProps() : undefined,
                  )}
                  className={cn(
                    'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary',
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
            : rows.map((row: any) => {
                prepareRow(row);
                return (
                  <tr
                    {...row.getRowProps()}
                    onClick={() => onRowClick?.(row.original)}
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
                          cell.column.align === 'right' && 'text-right',
                        )}
                      >
                        {cell.render('Cell')}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
