import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

export interface ListViewProps {
  title: React.ReactNode;
  primaryAction?: { label: React.ReactNode; onClick: () => void };
  columns: any[];
  data: any[];
  getRowId: (row: any) => string;
  loading?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  bulkDelete?: { label: React.ReactNode; onClick: (ids: string[]) => void };
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total?: number;
  onPageChange: (idx: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange?: (sortBy: { id: string; desc: boolean }[]) => void;
  onRowClick?: (row: any) => void;
  emptyState?: React.ReactNode;
  /**
   * Отборы экрана: встают рядом с поиском.
   *
   * Нужны там, где список отвечает на несколько вопросов сразу — например,
   * «кто должен деньгами» и «кто должен поставкой» (FIN-023).
   */
  filters?: React.ReactNode;
}

export function ListView({
  title,
  primaryAction,
  columns,
  data,
  getRowId,
  loading = false,
  search,
  onSearchChange,
  searchPlaceholder,
  selectedIds,
  onSelectionChange,
  bulkDelete,
  pageIndex,
  pageSize,
  pageCount,
  total,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onRowClick,
  emptyState,
  filters,
}: ListViewProps) {
  return (
    <div className="bigfin-ui light min-h-full bg-background p-6">
      <PageHeader
        title={title}
        action={
          primaryAction && (
            <Button onClick={primaryAction.onClick}>
              <Plus className="h-4 w-4" />
              {primaryAction.label}
            </Button>
          )
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        selectedCount={selectedIds.length}
        bulkActions={
          bulkDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => bulkDelete.onClick(selectedIds)}
            >
              <Trash2 className="h-4 w-4" />
              {bulkDelete.label}
            </Button>
          )
        }
      />

      {filters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">{filters}</div>
      )}

      <DataTable
        columns={columns}
        data={data}
        getRowId={getRowId}
        loading={loading}
        enableSelection
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onSortChange={onSortChange}
        onRowClick={onRowClick}
        emptyState={emptyState}
      />

      {(!loading || data.length > 0) && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
