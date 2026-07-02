import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import {
  CreditNotesActionsMenuV2,
  type CreditNoteRow,
  type CreditNoteRowActions,
} from './CreditNotesActionsMenuV2';

function StatusBadge({ row }: { row: CreditNoteRow }) {
  if (row.is_open) {
    return <Badge variant="secondary">{intl.get('open')}</Badge>;
  }
  if (row.is_closed) {
    return <Badge variant="success">{intl.get('closed')}</Badge>;
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Колонки таблицы возвратов покупателям для нового DataTable.
 */
export function useCreditNotesTableColumnsV2(actions: CreditNoteRowActions) {
  return useMemo(
    () => [
      {
        id: 'credit_date',
        Header: intl.get('credit_note.column.credit_date'),
        accessor: 'formatted_credit_note_date',
        width: 120,
      },
      {
        id: 'customer',
        Header: intl.get('customer_name'),
        disableSortBy: true,
        width: 180,
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
          <span className="font-medium">
            {row.original.customer?.display_name}
          </span>
        ),
      },
      {
        id: 'credit_number',
        Header: intl.get('credit_note.column.credit_note_no'),
        accessor: 'credit_note_number',
        width: 110,
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        accessor: 'formatted_amount',
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
          <span className="font-medium">{row.original.formatted_amount}</span>
        ),
      },
      {
        id: 'balance',
        Header: intl.get('balance'),
        align: 'right',
        disableSortBy: true,
        width: 120,
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
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
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
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
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
          <CreditNotesActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
