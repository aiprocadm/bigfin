import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import {
  WarehouseTransfersActionsMenuV2,
  type WarehouseTransferRow,
  type WarehouseTransferRowActions,
} from './WarehouseTransfersActionsMenuV2';

function StatusBadge({ row }: { row: WarehouseTransferRow }) {
  if (row.is_initiated && !row.is_transferred) {
    return (
      <Badge variant="secondary">
        {intl.get('warehouse_transfer.label.transfer_initiated')}
      </Badge>
    );
  }
  if (row.is_initiated && row.is_transferred) {
    return (
      <Badge variant="success">
        {intl.get('warehouse_transfer.label.transferred')}
      </Badge>
    );
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Колонки таблицы перемещений между складами для нового DataTable.
 */
export function useWarehouseTransfersTableColumnsV2(
  actions: WarehouseTransferRowActions,
) {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: 'formatted_date',
        width: 120,
      },
      {
        id: 'transaction_number',
        Header: intl.get('warehouse_transfer.column.transfer_no'),
        accessor: 'transaction_number',
        width: 110,
      },
      {
        id: 'from_warehouse',
        Header: intl.get('warehouse_transfer.column.from_warehouse'),
        disableSortBy: true,
        width: 150,
        Cell: ({ row }: { row: { original: WarehouseTransferRow } }) => (
          <span>{row.original.from_warehouse?.name}</span>
        ),
      },
      {
        id: 'to_warehouse',
        Header: intl.get('warehouse_transfer.column.to_warehouse'),
        disableSortBy: true,
        width: 150,
        Cell: ({ row }: { row: { original: WarehouseTransferRow } }) => (
          <span>{row.original.to_warehouse?.name}</span>
        ),
      },
      {
        id: 'status',
        Header: intl.get('status'),
        disableSortBy: true,
        width: 150,
        Cell: ({ row }: { row: { original: WarehouseTransferRow } }) => (
          <StatusBadge row={row.original} />
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: WarehouseTransferRow } }) => (
          <WarehouseTransfersActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
