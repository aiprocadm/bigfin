import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface CurrencyRow {
  currency_name: string;
  currency_code: string;
  currency_sign: string;
  is_base_currency?: boolean;
}

export interface CurrencyRowActions {
  onEditCurrency: (row: CurrencyRow) => void;
  onDeleteCurrency: (row: CurrencyRow) => void;
}

/**
 * Меню действий строки валюты (shadcn DropdownMenu).
 */
export function CurrencyActionsMenu({
  row,
  actions,
}: {
  row: CurrencyRow;
  actions: CurrencyRowActions;
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
        <DropdownMenuItem onClick={() => actions.onEditCurrency(row)}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('edit_currency')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onClick={() => actions.onDeleteCurrency(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('delete_currency')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Колонки таблицы валют для нового DataTable (react-table v7 формат).
 */
export function useCurrenciesTableColumns(actions: CurrencyRowActions) {
  return useMemo(
    () => [
      {
        id: 'currency_name',
        Header: intl.get('currency_name'),
        accessor: 'currency_name',
        disableSortBy: true,
        width: 200,
        Cell: ({ row }: { row: { original: CurrencyRow } }) => (
          <span className="flex items-center gap-2">
            <span className="font-medium">{row.original.currency_name}</span>
            {row.original.is_base_currency && (
              <Badge variant="secondary">{intl.get('base_currency')}</Badge>
            )}
          </span>
        ),
      },
      {
        id: 'currency_code',
        Header: intl.get('currency_code'),
        accessor: 'currency_code',
        disableSortBy: true,
        width: 120,
      },
      {
        id: 'currency_sign',
        Header: intl.get('currency_sign'),
        accessor: 'currency_sign',
        disableSortBy: true,
        width: 120,
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: CurrencyRow } }) => (
          <CurrencyActionsMenu row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
