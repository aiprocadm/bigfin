import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Money } from '@/components';
import { Badge } from '@/components/ui/badge';
import {
  EstimatesActionsMenuV2,
  type EstimateRow,
  type EstimateRowActions,
} from './EstimatesActionsMenuV2';

type EstimateBadgeVariant = 'success' | 'destructive' | 'secondary';

/**
 * Статус сметы → подпись + вариант Badge.
 * Приоритет статусов повторяет легаси statusAccessor:
 * одобрена → отклонена → истекла → отправлена → черновик.
 * «Истекла» — просрочка, поэтому danger (правило цвета стандарта простоты).
 */
export function getEstimateStatus(row: EstimateRow): {
  labelKey: string;
  variant: EstimateBadgeVariant;
} {
  if (row.is_approved) return { labelKey: 'approved', variant: 'success' };
  if (row.is_rejected) return { labelKey: 'rejected', variant: 'destructive' };
  if (row.is_expired)
    return { labelKey: 'estimate.status.expired', variant: 'destructive' };
  if (row.is_delivered)
    return { labelKey: 'estimate.status.delivered', variant: 'success' };
  return { labelKey: 'draft', variant: 'secondary' };
}

/** Пилюля статуса сметы (shadcn Badge, замена Blueprint Tag). */
export function EstimateStatusBadgeV2({ row }: { row: EstimateRow }) {
  const { labelKey, variant } = getEstimateStatus(row);
  return <Badge variant={variant}>{intl.get(labelKey)}</Badge>;
}

/**
 * Колонки таблицы смет для нового DataTable (react-table v7 формат).
 */
export function useEstimatesTableColumnsV2(actions: EstimateRowActions) {
  return useMemo(
    () => [
      {
        id: 'estimate_date',
        Header: intl.get('estimate_date'),
        accessor: 'formatted_estimate_date',
        width: 130,
        Cell: ({ row }: { row: { original: EstimateRow } }) => (
          <span className="whitespace-nowrap">
            {row.original.formatted_estimate_date}
          </span>
        ),
      },
      {
        id: 'estimate_number',
        Header: intl.get('estimate_number'),
        accessor: 'estimate_number',
        width: 130,
        Cell: ({ row }: { row: { original: EstimateRow } }) => (
          <span className="font-medium">{row.original.estimate_number}</span>
        ),
      },
      {
        id: 'customer',
        Header: intl.get('customer_name'),
        accessor: 'customer.display_name',
        width: 200,
        Cell: ({ row }: { row: { original: EstimateRow } }) => (
          <span className="truncate">
            {row.original.customer?.display_name}
          </span>
        ),
      },
      {
        id: 'expiration_date',
        Header: intl.get('expiration_date'),
        accessor: 'expiration_date',
        width: 130,
        Cell: ({ row }: { row: { original: EstimateRow } }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.formatted_expiration_date}
          </span>
        ),
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 130,
        Cell: ({ row }: { row: { original: EstimateRow } }) => (
          <Money
            amount={row.original.amount}
            currency={row.original.currency_code}
          />
        ),
      },
      {
        id: 'status',
        Header: intl.get('status'),
        width: 120,
        Cell: ({ row }: { row: { original: EstimateRow } }) => (
          <EstimateStatusBadgeV2 row={row.original} />
        ),
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference',
        width: 100,
        Cell: ({ row }: { row: { original: EstimateRow } }) => (
          <span className="text-text-secondary">{row.original.reference}</span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: EstimateRow } }) => (
          <EstimatesActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
