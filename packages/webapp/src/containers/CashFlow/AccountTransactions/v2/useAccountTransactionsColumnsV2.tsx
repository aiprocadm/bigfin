import React from 'react';
import intl from 'react-intl-universal';
import { TransactionStatusBadge } from './TransactionStatusBadge';
import { TransactionRowActions } from './TransactionRowActions';

interface ColumnsHandlers {
  onUncategorize: (row: any) => void;
  onUnmatch: (row: any) => void;
}

/**
 * Колонки таблицы «Все транзакции» под примитив components/ui/data-table.tsx
 * (react-table v7 shape: id, Header, accessor, align, disableSortBy, Cell).
 */
export function useAccountTransactionsColumnsV2({
  onUncategorize,
  onUnmatch,
}: ColumnsHandlers) {
  return React.useMemo(
    () => [
      { id: 'date', Header: intl.get('date'), accessor: 'formatted_date' },
      { id: 'type', Header: intl.get('type'), accessor: 'formatted_transaction_type' },
      {
        id: 'transaction_number',
        Header: intl.get('transaction_number'),
        accessor: 'transaction_number',
      },
      {
        id: 'reference_number',
        Header: intl.get('reference_no'),
        accessor: 'reference_number',
      },
      {
        id: 'status',
        Header: intl.get('status'),
        accessor: 'status',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <TransactionStatusBadge
            status={row.original.status}
            label={row.original.formatted_status}
          />
        ),
      },
      {
        id: 'deposit',
        Header: intl.get('banking.label.deposit'),
        accessor: 'formatted_deposit',
        align: 'right',
      },
      {
        id: 'withdrawal',
        Header: intl.get('banking.label.withdrawal'),
        accessor: 'formatted_withdrawal',
        align: 'right',
      },
      {
        id: 'running_balance',
        Header: intl.get('banking.label.running_balance'),
        accessor: 'formatted_running_balance',
        align: 'right',
      },
      {
        id: 'actions',
        Header: '',
        disableSortBy: true,
        align: 'right',
        Cell: ({ row }: any) => (
          <TransactionRowActions
            status={row.original.status}
            onUncategorize={() => onUncategorize(row.original)}
            onUnmatch={() => onUnmatch(row.original)}
          />
        ),
      },
    ],
    [onUncategorize, onUnmatch],
  );
}
