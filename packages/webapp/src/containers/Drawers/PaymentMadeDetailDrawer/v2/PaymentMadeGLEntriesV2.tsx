import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { useTransactionsByReference } from '@/hooks/query';
import { useCurrentOrganization } from '@/hooks/state/organizations';

import type { GLTransaction } from './types';

const EMPTY_VALUE = '—';

interface PaymentMadeGLEntriesV2Props {
  paymentMadeId: number;
}

// useTransactionsByReference — легаси react-query хук без типов,
// кастуем результат локально.
interface UseTransactionsByReferenceResult {
  data: { transactions: GLTransaction[] };
  isLoading: boolean;
}

// useCurrentOrganization — легаси-хук без типов, кастуем результат локально.
interface CurrentOrganization {
  base_currency?: string;
}

/** Строка проводки со стабильным id для DataTable. */
type GLTransactionRow = GLTransaction & { __id: string };

/**
 * Вкладка «Проводки»: журнальные проводки платежа (отчёт
 * transactions-by-reference), суммы в базовой валюте организации.
 */
export function PaymentMadeGLEntriesV2({
  paymentMadeId,
}: PaymentMadeGLEntriesV2Props) {
  const organization = useCurrentOrganization() as CurrentOrganization;

  const {
    data: { transactions },
    isLoading: isTransactionsLoading,
  } = useTransactionsByReference(
    {
      reference_id: paymentMadeId,
      reference_type: 'BillPayment',
    },
    { enabled: !!paymentMadeId },
  ) as UseTransactionsByReferenceResult;

  const rows = useMemo<GLTransactionRow[]>(
    () =>
      (transactions ?? []).map((transaction, index) => ({
        ...transaction,
        __id: String(index),
      })),
    [transactions],
  );

  const columns = useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: (row: GLTransactionRow) =>
          row.date?.formatted_date ?? EMPTY_VALUE,
        disableSortBy: true,
      },
      {
        id: 'account_name',
        Header: intl.get('account_name'),
        accessor: (row: GLTransactionRow) => row.account_name ?? EMPTY_VALUE,
        disableSortBy: true,
      },
      {
        id: 'contact',
        Header: intl.get('contact'),
        accessor: (row: GLTransactionRow) =>
          row.formatted_contact_type || EMPTY_VALUE,
        disableSortBy: true,
      },
      {
        id: 'debit',
        Header: intl.get('debit'),
        accessor: (row: GLTransactionRow) =>
          row.debit?.formatted_amount ?? EMPTY_VALUE,
        align: 'right',
        disableSortBy: true,
      },
      {
        id: 'credit',
        Header: intl.get('credit'),
        accessor: (row: GLTransactionRow) =>
          row.credit?.formatted_amount ?? EMPTY_VALUE,
        align: 'right',
        disableSortBy: true,
      },
    ],
    [],
  );

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        {intl.get('journal_entries.amount_displayed_base_currency')}
        {organization?.base_currency ? (
          <Badge variant="outline">{organization.base_currency}</Badge>
        ) : null}
      </div>

      <div className="mt-3">
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row: GLTransactionRow) => row.__id}
          loading={isTransactionsLoading}
        />
      </div>
    </Card>
  );
}
