import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useTransactionsByReference } from '@/hooks/query';
import { useCurrentOrganization } from '@/hooks/state';

import type { CreditNoteGLTransaction } from './types';

interface CreditNoteGLTabV2Props {
  creditNoteId: number;
}

interface UseTransactionsByReferenceResult {
  data: { transactions?: CreditNoteGLTransaction[] };
  isLoading: boolean;
}

type GLRow = CreditNoteGLTransaction & { __rowId: string };
const getGLRowId = (row: GLRow) => row.__rowId;

function useGLColumns() {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        width: 120,
        Cell: ({ row }: { row: { original: GLRow } }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.date?.formatted_date}
          </span>
        ),
      },
      {
        id: 'account_name',
        Header: intl.get('account_name'),
        accessor: 'account_name',
        width: 160,
      },
      {
        id: 'contact',
        Header: intl.get('contact'),
        accessor: 'contactTypeFormatted',
        width: 140,
      },
      {
        id: 'debit',
        Header: intl.get('debit'),
        align: 'right',
        width: 100,
        Cell: ({ row }: { row: { original: GLRow } }) => (
          <span>{row.original.debit?.formatted_amount}</span>
        ),
      },
      {
        id: 'credit',
        Header: intl.get('credit'),
        align: 'right',
        width: 100,
        Cell: ({ row }: { row: { original: GLRow } }) => (
          <span>{row.original.credit?.formatted_amount}</span>
        ),
      },
    ],
    [],
  );
}

/**
 * Вкладка «Проводки»: журнальные записи по возврату (в базовой валюте).
 */
export function CreditNoteGLTabV2({ creditNoteId }: CreditNoteGLTabV2Props) {
  const { data, isLoading } = useTransactionsByReference(
    { reference_id: creditNoteId, reference_type: 'creditNote' },
    { enabled: !!creditNoteId },
  ) as UseTransactionsByReferenceResult;

  const rows = useMemo<GLRow[]>(
    () =>
      (data?.transactions ?? []).map((transaction, index) => ({
        ...transaction,
        __rowId: String(index),
      })),
    [data],
  );
  const columns = useGLColumns();
  const organization = useCurrentOrganization() as
    | { base_currency?: string }
    | undefined;

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 flex items-center gap-1.5 text-xs text-text-muted">
        {intl.get('journal_entries.amount_displayed_base_currency')}
        {organization?.base_currency ? (
          <Badge variant="outline">{organization.base_currency}</Badge>
        ) : null}
      </p>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={getGLRowId}
        loading={isLoading}
        emptyState={
          <p className="m-0 rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-muted">
            {intl.get('no_results')}
          </p>
        }
      />
    </div>
  );
}
