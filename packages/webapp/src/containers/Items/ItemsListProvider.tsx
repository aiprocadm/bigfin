import React, { createContext } from 'react';
import { isEmpty } from 'lodash';
import {
  getFieldsFromResourceMeta,
  transformTableQueryToParams,
} from '@/utils';
import { transformItemsTableState } from './utils';
import { DashboardInsider } from '@/components';
import { useResourceViews, useResourceMeta, useItems } from '@/hooks/query';


const ItemsContext = createContext<any>(undefined);

/**
 * Items list provider.
 */
function ItemsListProvider({
  tableState,
  tableStateChanged,
  ...props
}: {
  /** Состояние таблицы: страница, сортировка, отбор. */
  tableState?: any;
  /** Признак «состояние поменялось» — по нему решают, ждать ли ответ. */
  tableStateChanged?: boolean;
  children?: React.ReactNode;
}) {
  const tableQuery = transformItemsTableState(tableState);

  // Fetch accounts resource views and fields.
  const { data: itemsViews, isLoading: isViewsLoading } =
    useResourceViews('items');

  // Fetch the accounts resource fields.
  const {
    data: resourceMeta,
    isLoading: isResourceLoading,
    isFetching: isResourceFetching,
  } = useResourceMeta('items');

  // Handle fetching the items table based on the given query.
  const {
    data: { items, pagination, filterMeta },
    isFetching: isItemsFetching,
    isLoading: isItemsLoading,
    isError: isItemsError,
    refetch: refetchItems,
  } = useItems(
    {
      ...transformTableQueryToParams(tableQuery),
    },
    { keepPreviousData: true },
  );

  // Detarmines the datatable empty status.
  const isEmptyStatus = !tableStateChanged && !isItemsLoading && isEmpty(items);

  const state = {
    itemsViews,
    items,
    pagination,

    fields: getFieldsFromResourceMeta(resourceMeta.fields),

    isViewsLoading,
    isItemsLoading,
    isItemsFetching: isItemsFetching,
    isResourceLoading,
    isResourceFetching,

    isEmptyStatus,
  };

  return (
    <DashboardInsider
      loading={isViewsLoading || isResourceLoading}
      error={isItemsError}
      onRetry={refetchItems}
      name={'items-list'}
    >
      <ItemsContext.Provider value={state} {...props} />
    </DashboardInsider>
  );
}

const useItemsListContext = () => React.useContext(ItemsContext);

export { ItemsListProvider, useItemsListContext };
