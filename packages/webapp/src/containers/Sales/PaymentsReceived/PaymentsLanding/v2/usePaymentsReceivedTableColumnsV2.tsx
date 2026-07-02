import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Money } from '@/components';
import {
  PaymentsReceivedActionsMenuV2,
  type PaymentReceivedRow,
  type PaymentReceivedRowActions,
} from './PaymentsReceivedActionsMenuV2';

/**
 * Колонки таблицы входящих платежей для нового DataTable (react-table v7 формат).
 */
export function usePaymentsReceivedTableColumnsV2(
  actions: PaymentReceivedRowActions,
) {
  return useMemo(
    () => [
      {
        id: 'payment_date',
        Header: intl.get('payment_date'),
        accessor: 'formatted_payment_date',
        width: 130,
        Cell: ({ row }: { row: { original: PaymentReceivedRow } }) => (
          <span className="whitespace-nowrap tabular-nums">
            {row.original.formatted_payment_date}
          </span>
        ),
      },
      {
        id: 'customer',
        Header: intl.get('customer_name'),
        accessor: 'customer.display_name',
        width: 200,
        Cell: ({ row }: { row: { original: PaymentReceivedRow } }) => (
          <span className="truncate font-medium">
            {row.original.customer?.display_name}
          </span>
        ),
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 130,
        Cell: ({ row }: { row: { original: PaymentReceivedRow } }) => (
          <span className="font-medium text-success">
            <Money
              amount={row.original.amount}
              currency={row.original.currency_code}
            />
          </span>
        ),
      },
      {
        id: 'payment_receive_no',
        Header: intl.get('payment_received_no'),
        accessor: 'payment_receive_no',
        width: 140,
        Cell: ({ row }: { row: { original: PaymentReceivedRow } }) => (
          <span className="tabular-nums text-text-secondary">
            {row.original.payment_receive_no}
          </span>
        ),
      },
      {
        id: 'deposit_account',
        Header: intl.get('deposit_account'),
        accessor: 'deposit_account.name',
        width: 160,
        Cell: ({ row }: { row: { original: PaymentReceivedRow } }) => (
          <span className="text-text-secondary">
            {row.original.deposit_account?.name}
          </span>
        ),
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference_no',
        width: 130,
        Cell: ({ row }: { row: { original: PaymentReceivedRow } }) => (
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
        Cell: ({ row }: { row: { original: PaymentReceivedRow } }) => (
          <PaymentsReceivedActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
