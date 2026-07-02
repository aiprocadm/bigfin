import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import {
  VendorsCreditNotesActionsMenuV2,
  type VendorCreditRow,
  type VendorCreditRowActions,
} from './VendorsCreditNotesActionsMenuV2';

function StatusBadge({ row }: { row: VendorCreditRow }) {
  if (row.is_open) {
    return <Badge variant="secondary">{intl.get('open')}</Badge>;
  }
  if (row.is_closed) {
    return <Badge variant="success">{intl.get('closed')}</Badge>;
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Колонки таблицы возвратов поставщикам для нового DataTable.
 */
export function useVendorsCreditNotesTableColumnsV2(
  actions: VendorCreditRowActions,
) {
  return useMemo(
    () => [
      {
        id: 'credit_date',
        Header: intl.get('date'),
        accessor: 'formatted_vendor_credit_date',
        width: 120,
      },
      {
        id: 'vendor',
        Header: intl.get('vendor_name'),
        disableSortBy: true,
        width: 180,
        Cell: ({ row }: { row: { original: VendorCreditRow } }) => (
          <span className="font-medium">
            {row.original.vendor?.display_name}
          </span>
        ),
      },
      {
        id: 'credit_number',
        Header: intl.get('vendor_credits.column.vendor_credit_no'),
        accessor: 'vendor_credit_number',
        width: 110,
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        accessor: 'formatted_amount',
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: VendorCreditRow } }) => (
          <span className="font-medium">{row.original.formatted_amount}</span>
        ),
      },
      {
        id: 'balance',
        Header: intl.get('balance'),
        align: 'right',
        disableSortBy: true,
        width: 120,
        Cell: ({ row }: { row: { original: VendorCreditRow } }) => (
          <span className="font-medium">
            {row.original.formatted_credits_remaining}
          </span>
        ),
      },
      {
        id: 'status',
        Header: intl.get('status'),
        disableSortBy: true,
        width: 130,
        Cell: ({ row }: { row: { original: VendorCreditRow } }) => (
          <StatusBadge row={row.original} />
        ),
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference_no',
        disableSortBy: true,
        width: 100,
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: VendorCreditRow } }) => (
          <VendorsCreditNotesActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
