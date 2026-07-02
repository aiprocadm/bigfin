import { useMemo } from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';

import { Badge } from '@/components/ui/badge';
import {
  InventoryAdjustmentsActionsMenuV2,
  type InventoryAdjustmentRow,
  type InventoryAdjustmentRowActions,
} from './InventoryAdjustmentsActionsMenuV2';

/**
 * Колонки таблицы инвентаризаций для нового DataTable.
 */
export function useInventoryAdjustmentsColumnsV2(
  actions: InventoryAdjustmentRowActions,
) {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        disableSortBy: true,
        width: 120,
        Cell: ({ row }: { row: { original: InventoryAdjustmentRow } }) => (
          <span>{moment(row.original.date).format('DD MMM YYYY')}</span>
        ),
      },
      {
        id: 'type',
        Header: intl.get('type'),
        disableSortBy: true,
        width: 120,
        Cell: ({ row }: { row: { original: InventoryAdjustmentRow } }) =>
          row.original.formatted_type ? (
            <Badge variant="secondary">{row.original.formatted_type}</Badge>
          ) : null,
      },
      {
        id: 'reason',
        Header: intl.get('reason'),
        accessor: 'reason',
        disableSortBy: true,
        width: 140,
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference_no',
        disableSortBy: true,
        width: 110,
      },
      {
        id: 'published_at',
        Header: intl.get('status'),
        disableSortBy: true,
        width: 110,
        Cell: ({ row }: { row: { original: InventoryAdjustmentRow } }) =>
          row.original.is_published ? (
            <Badge variant="success">{intl.get('published')}</Badge>
          ) : (
            <Badge variant="outline">{intl.get('draft')}</Badge>
          ),
      },
      {
        id: 'created_at',
        Header: intl.get('created_at'),
        disableSortBy: true,
        width: 130,
        Cell: ({ row }: { row: { original: InventoryAdjustmentRow } }) => (
          <span className="text-text-secondary">
            {moment(row.original.created_at).format('DD MMM YYYY')}
          </span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: InventoryAdjustmentRow } }) => (
          <InventoryAdjustmentsActionsMenuV2
            row={row.original}
            actions={actions}
          />
        ),
      },
    ],
    [actions],
  );
}
