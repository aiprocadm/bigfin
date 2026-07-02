import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { useTransactionsByReference } from '@/hooks/query';
import { useCurrentOrganization } from '@/hooks/state/organizations';

import type { PaymentReceivedGLTransaction } from './types';

interface PaymentReceiveGLEntriesV2Props {
  paymentReceiveId: number;
}

// Легаси react-query хук без типов — кастуем результат локально.
interface UseTransactionsByReferenceResult {
  data: { transactions: PaymentReceivedGLTransaction[] };
  isLoading: boolean;
}

// useCurrentOrganization — легаси-хук без типов, кастуем результат локально.
type CurrentOrganization = { base_currency?: string } | undefined;

/** Строка таблицы с гарантированным ключом (у легаси-записей id опционален). */
type GLRow = PaymentReceivedGLTransaction & { _rowId: string };

/**
 * Вкладка «Проводки»: журнальные записи платежа (дебет/кредит) с пометкой,
 * что суммы показаны в базовой валюте.
 */
export function PaymentReceiveGLEntriesV2({
  paymentReceiveId,
}: PaymentReceiveGLEntriesV2Props) {
  const organization = useCurrentOrganization() as CurrentOrganization;

  const {
    data: { transactions },
    isLoading,
  } = useTransactionsByReference(
    {
      reference_id: paymentReceiveId,
      reference_type: 'paymentReceive',
    },
    { enabled: !!paymentReceiveId },
  ) as UseTransactionsByReferenceResult;

  const rows = useMemo<GLRow[]>(
    () =>
      (transactions ?? []).map((transaction, index) => ({
        ...transaction,
        _rowId: String(transaction.id ?? index),
      })),
    [transactions],
  );

  const columns = useMemo(
    () => [
      {
        Header: intl.get('date'),
        accessor: 'date.formatted_date',
        disableSortBy: true,
      },
      {
        Header: intl.get('account_name'),
        accessor: 'account_name',
        disableSortBy: true,
      },
      {
        Header: intl.get('contact'),
        accessor: 'contactTypeFormatted',
        disableSortBy: true,
      },
      {
        id: 'debit',
        Header: intl.get('debit'),
        accessor: (row: PaymentReceivedGLTransaction) =>
          row.debit?.formatted_amount,
        align: 'right',
        disableSortBy: true,
      },
      {
        id: 'credit',
        Header: intl.get('credit'),
        accessor: (row: PaymentReceivedGLTransaction) =>
          row.credit?.formatted_amount,
        align: 'right',
        disableSortBy: true,
      },
    ],
    [],
  );

  return (
    <Card className="p-4 sm:p-5">
      <p className="m-0 flex items-center gap-1.5 text-xs text-text-muted">
        {intl.get('journal_entries.amount_displayed_base_currency')}
        {organization?.base_currency ? (
          <Badge variant="outline">{organization.base_currency}</Badge>
        ) : null}
      </p>

      <div className="mt-3">
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row: GLRow) => row._rowId}
          loading={isLoading}
        />
      </div>
    </Card>
  );
}
