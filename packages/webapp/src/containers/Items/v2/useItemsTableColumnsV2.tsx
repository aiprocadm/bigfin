import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import {
  ItemsActionsMenuV2,
  type ItemRow,
  type ItemRowActions,
} from './ItemsActionsMenuV2';

/**
 * Бейдж типа позиции: услуга — outline (нет физического остатка),
 * товар / товар на складе — secondary.
 */
function ItemTypeBadge({ row }: { row: ItemRow }) {
  if (!row.type_formatted) return null;
  return (
    <Badge variant={row.type === 'service' ? 'outline' : 'secondary'}>
      {row.type_formatted}
    </Badge>
  );
}

/**
 * Колонки таблицы «Товары и услуги» для нового DataTable
 * (react-table v7 формат: {id, Header, accessor?, Cell?, width, align?}).
 */
export function useItemsTableColumnsV2(actions: ItemRowActions) {
  return useMemo(
    () => [
      {
        id: 'name',
        Header: intl.get('item_name'),
        accessor: 'name',
        width: 200,
        Cell: ({ row }: { row: { original: ItemRow } }) => (
          <span className="truncate font-medium">{row.original.name}</span>
        ),
      },
      {
        id: 'code',
        Header: intl.get('item_code'),
        accessor: 'code',
        width: 110,
        Cell: ({ row }: { row: { original: ItemRow } }) => (
          <span className="text-text-secondary">{row.original.code}</span>
        ),
      },
      {
        id: 'type',
        Header: intl.get('item_type'),
        accessor: 'type',
        width: 130,
        Cell: ({ row }: { row: { original: ItemRow } }) => (
          <ItemTypeBadge row={row.original} />
        ),
      },
      {
        id: 'category',
        Header: intl.get('category'),
        accessor: 'category.name',
        width: 140,
        Cell: ({ row }: { row: { original: ItemRow } }) => (
          <span className="truncate text-text-secondary">
            {row.original.category?.name}
          </span>
        ),
      },
      {
        id: 'sell_price',
        Header: intl.get('sell_price'),
        align: 'right',
        width: 130,
        Cell: ({ row }: { row: { original: ItemRow } }) => (
          <span>{row.original.sell_price_formatted}</span>
        ),
      },
      {
        id: 'cost_price',
        Header: intl.get('cost_price'),
        align: 'right',
        width: 130,
        Cell: ({ row }: { row: { original: ItemRow } }) => (
          <span>{row.original.cost_price_formatted}</span>
        ),
      },
      {
        id: 'quantity_on_hand',
        Header: intl.get('quantity_on_hand'),
        align: 'right',
        width: 130,
        Cell: ({ row }: { row: { original: ItemRow } }) => {
          const qty = row.original.quantity_on_hand;
          if (typeof qty !== 'number') return null;
          return <span className={cn(qty < 0 && 'text-danger')}>{qty}</span>;
        },
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: ItemRow } }) => (
          <ItemsActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
