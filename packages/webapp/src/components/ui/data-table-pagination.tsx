import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export interface DataTablePaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function DataTablePagination({
  pageIndex,
  pageSize,
  pageCount,
  total,
  pageSizeOptions = [20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to =
    total != null
      ? Math.min((pageIndex + 1) * pageSize, total)
      : (pageIndex + 1) * pageSize;

  return (
    <div className="flex items-center justify-between py-3 text-sm text-text-secondary">
      <span>
        {from}–{to}
        {total != null ? ` / ${total}` : ''}
      </span>
      <div className="flex items-center gap-2">
        <select
          className="h-8 rounded-md border border-border bg-surface-elevated px-2 text-text-primary"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums">
          {pageIndex + 1} / {Math.max(pageCount, 1)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={pageIndex + 1 >= pageCount}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
