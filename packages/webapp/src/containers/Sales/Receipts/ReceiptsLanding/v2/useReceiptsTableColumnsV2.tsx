import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Money } from '@/components';
import { Badge } from '@/components/ui/badge';
import {
  ReceiptsActionsMenuV2,
  type ReceiptRow,
  type ReceiptRowActions,
} from './ReceiptsActionsMenuV2';

/**
 * Колонки таблицы чеков для нового DataTable (react-table v7 формат).
 */
export function useReceiptsTableColumnsV2(actions: ReceiptRowActions) {
  return useMemo(
    () => [
      {
        id: 'receipt_date',
        Header: intl.get('receipt_date'),
        accessor: 'formatted_receipt_date',
        width: 120,
        Cell: ({ row }: { row: { original: ReceiptRow } }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.formatted_receipt_date}
          </span>
        ),
      },
      {
        id: 'customer',
        Header: intl.get('customer_name'),
        accessor: 'customer.display_name',
        width: 200,
        Cell: ({ row }: { row: { original: ReceiptRow } }) => (
          <span className="truncate font-medium">
            {row.original.customer?.display_name}
          </span>
        ),
      },
      {
        id: 'receipt_number',
        Header: intl.get('receipt_number'),
        accessor: 'receipt_number',
        width: 130,
        Cell: ({ row }: { row: { original: ReceiptRow } }) => (
          <span className="text-text-secondary">
            {row.original.receipt_number}
          </span>
        ),
      },
      {
        id: 'deposit_account',
        Header: intl.get('deposit_account'),
        accessor: 'deposit_account.name',
        width: 150,
        Cell: ({ row }: { row: { original: ReceiptRow } }) => (
          <span className="text-text-secondary">
            {row.original.deposit_account?.name}
          </span>
        ),
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 130,
        Cell: ({ row }: { row: { original: ReceiptRow } }) => (
          <span className="font-medium">
            <Money
              amount={row.original.amount}
              currency={row.original.currency_code}
            />
          </span>
        ),
      },
      {
        id: 'status',
        Header: intl.get('status'),
        width: 110,
        Cell: ({ row }: { row: { original: ReceiptRow } }) =>
          row.original.is_closed ? (
            <Badge variant="success">{intl.get('closed')}</Badge>
          ) : (
            <Badge variant="secondary">{intl.get('draft')}</Badge>
          ),
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference_no',
        width: 120,
        Cell: ({ row }: { row: { original: ReceiptRow } }) => (
          <span className="text-text-secondary">
            {row.original.reference_no}
          </span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: ReceiptRow } }) => (
          <ReceiptsActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
