import { useQueryClient, useMutation } from 'react-query';
import { transformPagination } from '@/utils';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';
import { unwrapData } from '@/utils/unwrapData';

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate warehouses transfers.
  queryClient.invalidateQueries(t.WAREHOUSE_TRANSFERS);

  // Invalidate item warehouses.
  queryClient.invalidateQueries(t.ITEM_WAREHOUSES_LOCATION);

  // Invalidate items.
  queryClient.invalidateQueries(t.ITEMS);
  queryClient.invalidateQueries(t.ITEM);
};

/**
 * Create a new warehouse transfer.
 */
export function useCreateWarehouseTransfer(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (values) => apiRequest.post('warehouse-transfers', values),
    {
      onSuccess: (res, values) => {
        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Edits the given warehouse transfer.
 */
export function useEditWarehouseTransfer(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`warehouse-transfers/${id}`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Invalidate specific sale invoice.
        queryClient.invalidateQueries([t.WAREHOUSE_TRANSFER, id]);

        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Deletes the given warehouse Transfer.
 */
export function useDeleteWarehouseTransfer(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`warehouse-transfers/${id}`), {
    onSuccess: (res, id) => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

const transformWarehousesTransfer = (res: any) => ({
  warehousesTransfers: unwrapData(res),
  pagination: transformPagination(res.data.pagination),
  filterMeta: res.data.filter,
});

/**
 * Retrieve Warehoues list.
 */
export function useWarehousesTransfers(query: any, props: any) {
  return useRequestQuery(
    [t.WAREHOUSE_TRANSFERS, query],
    { method: 'get', url: 'warehouse-transfers', params: query },
    {
      select: transformWarehousesTransfer,
      defaultData: {
        warehousesTransfers: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
        },
        filterMeta: {},
      },
      ...props,
    },
  );
}

/**
 * Retrieve the warehouse transfer details.
 * @param {number}
 */
export function useWarehouseTransfer(id: any, props: any, requestProps?: any) {
  return useRequestQuery(
    [t.WAREHOUSE_TRANSFER, id],
    { method: 'get', url: `warehouse-transfers/${id}`, ...requestProps },
    {
      select: (res: any) => unwrapData(res),
      defaultData: {},
      ...props,
    },
  );
}

/**
 *
 * @param {*} props
 * @returns
 */
export function useInitiateWarehouseTransfer(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (id) => apiRequest.put(`warehouse-transfers/${id}/initiate`),
    {
      onSuccess: (res, id) => {
        queryClient.invalidateQueries([t.WAREHOUSE_TRANSFER, id]);

        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 *
 * @param {*} props
 * @returns
 */
export function useTransferredWarehouseTransfer(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (id) => apiRequest.put(`warehouse-transfers/${id}/transferred`),
    {
      onSuccess: (res, id) => {
        queryClient.invalidateQueries([t.WAREHOUSE_TRANSFER, id]);

        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

export function useRefreshWarehouseTransfers() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.WAREHOUSE_TRANSFERS);
    },
  };
}
