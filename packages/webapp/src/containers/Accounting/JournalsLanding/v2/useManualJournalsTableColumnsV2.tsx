import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  ManualJournalsActionsMenuV2,
  type ManualJournalRow,
  type ManualJournalRowActions,
} from './ManualJournalsActionsMenuV2';

/**
 * Колонки таблицы проводок для нового DataTable (react-table v7 формат).
 */
export function useManualJournalsTableColumnsV2(
  actions: ManualJournalRowActions,
) {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: 'formatted_date',
        width: 110,
        Cell: ({ row }: { row: { original: ManualJournalRow } }) => (
          <span className="whitespace-nowrap tabular-nums text-text-secondary">
            {row.original.formatted_date}
          </span>
        ),
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: ManualJournalRow } }) => (
          <span className="font-medium">{row.original.amount_formatted}</span>
        ),
      },
      {
        id: 'journal_number',
        Header: intl.get('journal_no'),
        accessor: 'journal_number',
        width: 100,
      },
      {
        id: 'journal_type',
        Header: intl.get('journal_type'),
        accessor: 'journal_type',
        width: 110,
        Cell: ({ row }: { row: { original: ManualJournalRow } }) => (
          <span className="text-text-secondary">
            {row.original.journal_type}
          </span>
        ),
      },
      {
        id: 'status',
        Header: intl.get('publish'),
        disableSortBy: true,
        width: 100,
        Cell: ({ row }: { row: { original: ManualJournalRow } }) =>
          row.original.is_published ? (
            <Badge variant="success">{intl.get('published')}</Badge>
          ) : (
            <Badge variant="outline">{intl.get('draft')}</Badge>
          ),
      },
      {
        id: 'note',
        Header: intl.get('note'),
        disableSortBy: true,
        width: 60,
        Cell: ({ row }: { row: { original: ManualJournalRow } }) =>
          row.original.description ? (
            <span title={row.original.description} className="text-text-muted">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
          ) : null,
      },
      {
        id: 'created_at',
        Header: intl.get('created_at'),
        accessor: 'formatted_created_at',
        width: 125,
        Cell: ({ row }: { row: { original: ManualJournalRow } }) => (
          <span className="whitespace-nowrap tabular-nums text-text-secondary">
            {row.original.formatted_created_at}
          </span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: ManualJournalRow } }) => (
          <ManualJournalsActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
