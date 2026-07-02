import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import {
  AccountsActionsMenuV2,
  type AccountRow,
  type AccountRowActions,
} from './AccountsActionsMenuV2';

/** Id колонки «Имя»: в ней DataTable рисует шеврон/отступ дерева. */
export const ACCOUNTS_TREE_COLUMN_ID = 'name';

/**
 * Колонки плана счетов для нового DataTable (react-table v7 формат):
 * код, имя (с деревом), тип, валюта, баланс (вправо, tabular-nums).
 */
export function useAccountsTableColumnsV2(actions: AccountRowActions) {
  return useMemo(
    () => [
      {
        id: 'code',
        Header: intl.get('code'),
        accessor: 'code',
        width: 90,
        Cell: ({ row }: { row: { original: AccountRow } }) =>
          row.original.code ? (
            <Badge variant="secondary" className="tabular-nums">
              {row.original.code}
            </Badge>
          ) : null,
      },
      {
        id: ACCOUNTS_TREE_COLUMN_ID,
        Header: intl.get('account_name'),
        accessor: 'name',
        width: 260,
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{row.original.name}</span>
              {!row.original.active && (
                <Badge variant="outline" className="shrink-0 font-normal text-text-muted">
                  {intl.get('inactive')}
                </Badge>
              )}
            </span>
            {row.original.description && (
              <span className="truncate text-xs text-text-muted">
                {row.original.description}
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'type',
        Header: intl.get('type'),
        accessor: 'account_type_label',
        width: 150,
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <span className="text-text-secondary">
            {row.original.account_type_label}
          </span>
        ),
      },
      {
        id: 'currency',
        Header: intl.get('currency'),
        accessor: 'currency_code',
        width: 90,
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <span className="text-text-secondary">
            {row.original.currency_code}
          </span>
        ),
      },
      {
        id: 'balance',
        Header: intl.get('balance'),
        accessor: 'amount',
        align: 'right',
        width: 140,
        Cell: ({ row }: { row: { original: AccountRow } }) =>
          row.original.amount !== null ? (
            <span>{row.original.formatted_amount}</span>
          ) : (
            <span className="text-text-muted">&mdash;</span>
          ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <AccountsActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
