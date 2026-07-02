import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface BranchRow {
  id: number;
  name: string;
  code?: string;
  address?: string;
  phone_number?: string;
  primary?: boolean;
}

export interface BranchRowActions {
  onEdit: (row: BranchRow) => void;
  onDelete: (row: BranchRow) => void;
  onMarkPrimary: (row: BranchRow) => void;
}

/**
 * Меню действий строки филиала (shadcn DropdownMenu).
 */
export function BranchActionsMenu({
  row,
  actions,
}: {
  row: BranchRow;
  actions: BranchRowActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={intl.get('more_actions')}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => actions.onEdit(row)}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('branches.action.edit_branch')}
        </DropdownMenuItem>
        {!row.primary && (
          <DropdownMenuItem onClick={() => actions.onMarkPrimary(row)}>
            <Check className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('branches.action.mark_as_primary')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onClick={() => actions.onDelete(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('branches.action.delete_branch')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Колонки таблицы филиалов для нового DataTable (react-table v7 формат).
 */
export function useBranchesTableColumns(actions: BranchRowActions) {
  return useMemo(
    () => [
      {
        id: 'name',
        Header: intl.get('branches.column.branch_name'),
        accessor: 'name',
        disableSortBy: true,
        width: 200,
        Cell: ({ row }: { row: { original: BranchRow } }) => (
          <span className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.primary && (
              <Badge variant="secondary">
                {intl.get('branches.badge.primary')}
              </Badge>
            )}
          </span>
        ),
      },
      {
        id: 'code',
        Header: intl.get('branches.column.code'),
        accessor: 'code',
        disableSortBy: true,
        width: 100,
      },
      {
        id: 'address',
        Header: intl.get('branches.column.address'),
        accessor: 'address',
        disableSortBy: true,
        width: 220,
      },
      {
        id: 'phone_number',
        Header: intl.get('branches.column.phone_number'),
        accessor: 'phone_number',
        disableSortBy: true,
        width: 140,
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: BranchRow } }) => (
          <BranchActionsMenu row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
