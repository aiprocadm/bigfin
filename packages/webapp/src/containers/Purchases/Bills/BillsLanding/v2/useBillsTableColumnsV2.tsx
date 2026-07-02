import { useMemo, type ComponentType } from 'react';
import intl from 'react-intl-universal';

import { FormatDate } from '@/components';
import { Badge } from '@/components/ui/badge';
import { formattedAmount } from '@/utils';
import {
  BillsActionsMenuV2,
  type BillRow,
  type BillRowActions,
} from './BillsActionsMenuV2';

// Легаси-компонент без типов (возвращает строку, а не JSX) — кастуем локально.
const FormatDateV2 = FormatDate as unknown as ComponentType<{
  value: string;
  format?: string;
}>;

/**
 * Статус счёта поставщика пилюлями Badge.
 * Красный (destructive) — только просрочка; остальные статусы сдержанные.
 */
function BillStatusBadgesV2({ bill }: { bill: BillRow }) {
  if (bill.is_fully_paid && bill.is_open) {
    return <Badge variant="success">{intl.get('paid')}</Badge>;
  }
  if (bill.is_open) {
    return (
      <span className="flex flex-wrap items-center gap-1">
        {bill.is_overdue ? (
          <Badge variant="destructive">
            {intl.get('overdue_by', { overdue: bill.overdue_days })}
          </Badge>
        ) : (
          <Badge variant="secondary">
            {intl.get('due_in', { due: bill.remaining_days })}
          </Badge>
        )}
        {bill.is_partially_paid && (
          <Badge variant="secondary">
            {intl.get('day_partially_paid', {
              due: formattedAmount(bill.due_amount, bill.currency_code, undefined),
            })}
          </Badge>
        )}
      </span>
    );
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Колонки таблицы счетов поставщиков для нового DataTable
 * (react-table v7 формат).
 */
export function useBillsTableColumnsV2(actions: BillRowActions) {
  return useMemo(
    () => [
      {
        id: 'bill_date',
        Header: intl.get('bill_date'),
        accessor: 'formatted_bill_date',
        width: 110,
        Cell: ({ row }: { row: { original: BillRow } }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.formatted_bill_date}
          </span>
        ),
      },
      {
        id: 'vendor',
        Header: intl.get('vendor_name'),
        accessor: 'vendor.display_name',
        width: 180,
        Cell: ({ row }: { row: { original: BillRow } }) => (
          <span className="truncate font-medium">
            {row.original.vendor?.display_name}
          </span>
        ),
      },
      {
        id: 'bill_number',
        Header: intl.get('bill_number'),
        accessor: 'bill_number',
        width: 100,
        Cell: ({ row }: { row: { original: BillRow } }) => (
          <span className="text-text-secondary">
            {row.original.bill_number}
          </span>
        ),
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: BillRow } }) => (
          <span className="font-medium">{row.original.total_formatted}</span>
        ),
      },
      {
        id: 'status',
        Header: intl.get('status'),
        width: 180,
        Cell: ({ row }: { row: { original: BillRow } }) => (
          <BillStatusBadgesV2 bill={row.original} />
        ),
      },
      {
        id: 'due_date',
        Header: intl.get('due_date'),
        accessor: 'due_date',
        width: 110,
        Cell: ({ row }: { row: { original: BillRow } }) => (
          <span className="whitespace-nowrap text-text-secondary">
            <FormatDateV2 value={row.original.due_date} />
          </span>
        ),
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference_no',
        width: 90,
        Cell: ({ row }: { row: { original: BillRow } }) => (
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
        Cell: ({ row }: { row: { original: BillRow } }) => (
          <BillsActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
