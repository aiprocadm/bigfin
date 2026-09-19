import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useTransactionsByReference } from '@/hooks/query';
import { useCurrentOrganization } from '@/hooks/state';

import type { InvoiceGLTransaction } from './types';

interface InvoiceGLEntriesTabV2Props {
  invoiceId: number;
}

// useTransactionsByReference — легаси react-query хук без типов,
// кастуем результат локально.
interface UseTransactionsByReferenceResult {
  data: { transactions?: InvoiceGLTransaction[] };
  isLoading: boolean;
}

type InvoiceGLRow = InvoiceGLTransaction & { __rowId: string };

const getGLRowId = (row: InvoiceGLRow) => row.__rowId;

function useInvoiceGLColumnsV2() {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        width: 120,
        Cell: ({ row }: { row: { original: InvoiceGLRow } }) => (
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
        Cell: ({ row }: { row: { original: InvoiceGLRow } }) => (
          <span>{row.original.debit?.formatted_amount}</span>
        ),
      },
      {
        id: 'credit',
        Header: intl.get('credit'),
        align: 'right',
        width: 100,
        Cell: ({ row }: { row: { original: InvoiceGLRow } }) => (
          <span>{row.original.credit?.formatted_amount}</span>
        ),
      },
    ],
    [],
  );
}

/**
 * Вкладка «Проводки»: журнальные записи по счёту покупателю.
 * Суммы показываются в базовой валюте — подсказка над таблицей.
 */
export function InvoiceGLEntriesTabV2({
  invoiceId,
}: InvoiceGLEntriesTabV2Props) {
  const { data, isLoading } = useTransactionsByReference(
    { reference_id: invoiceId, reference_type: 'SaleInvoice' },
    { enabled: !!invoiceId },
  ) as UseTransactionsByReferenceResult;

  const transactions = data?.transactions ?? [];
  const rows = useMemo<InvoiceGLRow[]>(
    () =>
      transactions.map((transaction, index) => ({
        ...transaction,
        __rowId: String(index),
      })),
    [transactions],
  );
  const columns = useInvoiceGLColumnsV2();
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
          <p className="m-0 rounded-default border border-border bg-surface p-6 text-center text-sm text-text-muted">
            {intl.get('no_results')}
          </p>
        }
      />
    </div>
  );
}
