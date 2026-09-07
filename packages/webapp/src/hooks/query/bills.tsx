import { useQueryClient, useMutation } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import { transformPagination, transformToCamelCase } from '@/utils';
import useApiRequest from '../useRequest';
import t from './types';

const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate bills.
  queryClient.invalidateQueries(t.BILLS);

  // Invalidate items.
  queryClient.invalidateQueries(t.ITEMS);
  queryClient.invalidateQueries(t.ITEM);

  // Invalidate vendors.
  queryClient.invalidateQueries([t.VENDORS]);
  queryClient.invalidateQueries(t.VENDOR);

  // Invalidate accounts.
  queryClient.invalidateQueries(t.ACCOUNTS);
  queryClient.invalidateQueries(t.ACCOUNT);

  // Invalidate landed cost.
  queryClient.invalidateQueries(t.LANDED_COST);
  queryClient.invalidateQueries(t.LANDED_COST_TRANSACTION);

  // Invalidate reconcile.
  queryClient.invalidateQueries(t.RECONCILE_VENDOR_CREDIT);
  queryClient.invalidateQueries(t.RECONCILE_VENDOR_CREDITS);

  // Invalidate financial reports.
  queryClient.invalidateQueries(t.FINANCIAL_REPORT);

  // Invalidate the transactions by reference.
  queryClient.invalidateQueries(t.TRANSACTIONS_BY_REFERENCE);

  // Invalidate items associated bills transactions.
  queryClient.invalidateQueries(t.ITEMS_ASSOCIATED_WITH_BILLS);

  // Invalidate item warehouses.
  queryClient.invalidateQueries(t.ITEM_WAREHOUSES_LOCATION);

  // Invalidate mutate base currency abilities.
  queryClient.invalidateQueries(t.ORGANIZATION_MUTATE_BASE_CURRENCY_ABILITIES);
};

/**
 * Creates a new sale invoice.
 */
export function useCreateBill(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values) => apiRequest.post('bills', values), {
    onSuccess: (res, values) => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Дублирует расход в черновик-копию (О2 карты v13).
 */
export function useDuplicateBill(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, number>(
    (billId) => apiRequest.post(`bills/${billId}/duplicate`),
    {
      onSuccess: () => {
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Edits the given sale invoice.
 */
export function useEditBill(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`bills/${id}`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Common invalidate queries.
        commonInvalidateQueries(queryClient);

        // Invalidate bill query.
        queryClient.invalidateQueries([t.BILL, id]);
      },
      ...props,
    },
  );
}

/**
 * Marks the given bill as open.
 */
export function useOpenBill(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.patch(`bills/${id}/open`), {
    onSuccess: (res, id) => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);

      // Invalidate bill query.
      queryClient.invalidateQueries([t.BILL, id]);
    },
    ...props,
  });
}

/**
 * Deletes the given sale invoice.
 */
export function useDeleteBill(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.delete(`bills/${id}`), {
    onSuccess: (res, id) => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);

      // Invalidate bill query.
      queryClient.invalidateQueries([t.BILL, id]);
    },
    ...props,
  });
}

/**
 * Deletes multiple bills in bulk.
 */
export function useBulkDeleteBills(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (ids: number[]) => apiRequest.post('bills/bulk-delete', { ids }),
    {
      onSuccess: () => {
        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

export function useValidateBulkDeleteBills(props: any) {
  const apiRequest = useApiRequest();

  return useMutation(
    (ids: number[]) =>
      apiRequest
        .post('bills/validate-bulk-delete', { ids })
        .then((res) => transformToCamelCase(res.data)),
    {
      ...props,
    },
  );
}

const transformBillsResponse = (response: any) => ({
  bills: response.data.bills,
  pagination: transformPagination(response.data.pagination),
  filterMeta: response.data.filter_meta,
});

/**
 * Retrieve sale invoices list with pagination meta.
 */
export function useBills(query: any, props: any) {
  return useRequestQuery(
    [t.BILLS, query],
    {
      method: 'get',
      url: 'bills',
      params: query,
    },
    {
      select: transformBillsResponse,
      defaultData: {
        bills: [],
        pagination: {
          page: 1,
          page_size: 12,
          total: 0,
        },
        filterMeta: {},
      },
      ...props,
    },
  );
}

/**
 * Retrieve bill details of the given bill id.
 * @param {number} id - Bill id.
 */
export function useBill(id: any, props: any) {
  return useRequestQuery(
    [t.BILL, id],
    { method: 'get', url: `/bills/${id}` },
    {
      select: (res: any) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

/**
 * Retrieve the due bills of the given vendor id.
 * @param {number} vendorId -
 */
export function useDueBills(vendorId: any, props: any) {
  return useRequestQuery(
    [t.BILLS, t.BILLS_DUE, vendorId],
    {
      method: 'get',
      url: 'bills/due',
      params: { vendor_id: vendorId },
    },
    {
      select: (res: any) => res.data.bills,
      defaultData: [],
      ...props,
    },
  );
}

export function useRefreshBills() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.BILLS);
    },
  };
}

export function useBillPaymentTransactions(id: any, props: any) {
  return useRequestQuery(
    [t.BILLS_PAYMENT_TRANSACTIONS, id],
    {
      method: 'get',
      url: `bills/${id}/payment-transactions`,
    },
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props,
    },
  );
}
