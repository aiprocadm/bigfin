import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Money } from '@/components';
import {
  PaymentsMadeActionsMenuV2,
  type PaymentMadeRow,
  type PaymentMadeRowActions,
} from './PaymentsMadeActionsMenuV2';

/**
 * Колонки таблицы исходящих платежей для нового DataTable (react-table v7 формат).
 */
export function usePaymentsMadeTableColumnsV2(actions: PaymentMadeRowActions) {
  return useMemo(
    () => [
      {
        id: 'payment_date',
        Header: intl.get('payment_date'),
        accessor: 'formatted_payment_date',
        width: 140,
        Cell: ({ row }: { row: { original: PaymentMadeRow } }) => (
          <span className="whitespace-nowrap font-medium">
            {row.original.formatted_payment_date}
          </span>
        ),
      },
      {
        id: 'vendor',
        Header: intl.get('vendor_name'),
        accessor: 'vendor.display_name',
        width: 180,
        Cell: ({ row }: { row: { original: PaymentMadeRow } }) => (
          <span className="truncate">
            {row.original.vendor?.display_name}
          </span>
        ),
      },
      {
        id: 'payment_number',
        Header: intl.get('payment_number'),
        accessor: (row: PaymentMadeRow) => row.payment_number ?? null,
        width: 140,
        Cell: ({ row }: { row: { original: PaymentMadeRow } }) => (
          <span className="text-text-secondary tabular-nums">
            {row.original.payment_number}
          </span>
        ),
      },
      {
        id: 'payment_account',
        Header: intl.get('payment_account'),
        accessor: 'payment_account.name',
        width: 160,
        Cell: ({ row }: { row: { original: PaymentMadeRow } }) => (
          <span className="text-text-secondary">
            {row.original.payment_account?.name}
          </span>
        ),
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        // accessor нужен, чтобы колонка осталась сортируемой (canSort в
        // react-table v7 требует accessor); сортировка серверная (manualSortBy).
        accessor: 'amount',
        align: 'right',
        width: 140,
        Cell: ({ row }: { row: { original: PaymentMadeRow } }) => (
          <Money
            amount={row.original.amount}
            currency={row.original.currency_code}
          />
        ),
      },
      {
        id: 'reference_no',
        Header: intl.get('reference'),
        accessor: 'reference',
        width: 120,
        Cell: ({ row }: { row: { original: PaymentMadeRow } }) => (
          <span className="text-text-muted">{row.original.reference}</span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: PaymentMadeRow } }) => (
          <PaymentsMadeActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
