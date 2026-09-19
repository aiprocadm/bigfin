import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import { transformPagination } from '@/utils';
import useApiRequest from '../useRequest';
import t from './types';
import type {
  QueryCacheClient,
  QueryHookOptions,
} from './hookTypes';

// Номер записи МОЖЕТ БЫТЬ НЕ ИЗВЕСТЕН: шторка ещё не открыта, окно
// предпросмотра не выбрало документ. Запрос в этом случае просто не
// выполняется. Требовать номер всегда значило бы заставить каждого
// вызывающего врать — подставлять ноль или пустую строку.

/** Ответ сервера: разбирается прямо в хуке. */
type ApiResponse = { data: any };

const commonInvalidateQueries = (client: QueryCacheClient) => {
  // Invalidate payment mades.
  client.invalidateQueries(t.PAYMENT_MADES);

  // Invalidate payment made new entries.
  client.invalidateQueries(t.PAYMENT_MADE_NEW_ENTRIES);
  client.invalidateQueries(t.PAYMENT_MADE_EDIT_PAGE);

  // Invalidate financial reports.
  client.invalidateQueries(t.FINANCIAL_REPORT);

  // Invalidate accounts.
  client.invalidateQueries(t.ACCOUNTS);
  client.invalidateQueries(t.ACCOUNT);

  // Invalidate bills.
  client.invalidateQueries(t.BILLS);
  client.invalidateQueries(t.BILL);

  // Invalidate vendors.
  client.invalidateQueries(t.VENDORS);
  client.invalidateQueries(t.VENDOR);

  // Invalidate the cashflow transactions.
  client.invalidateQueries(t.CASH_FLOW_TRANSACTIONS);
  client.invalidateQueries(t.CASHFLOW_ACCOUNT_TRANSACTIONS_INFINITY);

  // Invalidate bills payment transactions.
  client.invalidateQueries(t.BILLS_PAYMENT_TRANSACTIONS);
};

/**
 * Retrieve payment mades list.
 */
export function usePaymentMades(query?: Record<string, any>, props?: QueryHookOptions) {
  return useRequestQuery(
    [t.PAYMENT_MADES, query],
    { url: 'bill-payments', params: query },
    {
      select: (res: ApiResponse) => ({
        paymentMades: res.data.bill_payments,
        pagination: transformPagination(res.data.pagination),
        filterMeta: res.data.filter_meta,
      }),
      defaultData: {
        paymentMades: [],
        pagination: {},
        filterMeta: {},
      },
      ...props,
    },
  );
}

/**
 * Creates payment made.
 */
export function useCreatePaymentMade(props?: QueryHookOptions) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values: any) => apiRequest.post('bill-payments', values), {
    onSuccess: (res, values) => {
      // Common invalidation queries.
      commonInvalidateQueries(client);
    },
    ...props,
  });
}

/**
 * Edits payment made.
 */
export function useEditPaymentMade(props?: QueryHookOptions) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`bill-payments/${id}`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Common invalidation queries.
        commonInvalidateQueries(client);

        // Invalidate specific payment made.
        client.invalidateQueries([t.PAYMENT_MADE, id]);
      },
      ...props,
    },
  );
}

/**
 * Deletes payment made.
 */
export function useDeletePaymentMade(props?: QueryHookOptions) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`bill-payments/${id}`), {
    onSuccess: (res, id) => {
      // Common invalidation queries.
      commonInvalidateQueries(client);

      // Invalidate specific payment made.
      client.invalidateQueries([t.PAYMENT_MADE, id]);
    },
    ...props,
  });
}

/**
 * Retrieve specific payment made.
 */
export function usePaymentMadeEditPage(
  id: number,
  // Ключ запроса здесь — список из имени и номера, и это надо сказать
  // прямо: по умолчанию тип ключа шире, и настройки к нему не подходят.
  props?: UseQueryOptions<any, Error, any, (string | number)[]>,
) {
  const apiRequest = useApiRequest();
  return useQuery([t.PAYMENT_MADE_EDIT_PAGE, id], () =>
    apiRequest.get(`bill-payments/${id}/edit-page`).then((res: ApiResponse) => res.data),
    props
  );
}

/**
 * Retreive payment made new page entries.
 * @param {number} vendorId -
 */
export function usePaymentMadeNewPageEntries(vendorId: number | string | null | undefined, props?: QueryHookOptions) {
  return useRequestQuery(
    [t.PAYMENT_MADE_NEW_ENTRIES, vendorId],
    {
      method: 'get',
      url: `bill-payments/new-page/entries`,
      params: { vendor_id: vendorId },
    },
    {
      select: (res: ApiResponse) => res.data,
      defaultData: [],
      ...props,
    },
  );
}

export function useRefreshPaymentMades() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.PAYMENT_MADES);
    },
  };
}

/**
 * Retrieve specific payment made.
 * @param {number} id - Payment made.
 */
export function usePaymentMade(id: number | string | null | undefined, props?: QueryHookOptions) {
  return useRequestQuery(
    [t.PAYMENT_MADE, id],
    { method: 'get', url: `bill-payments/${id}` },
    {
      select: (res: ApiResponse) => res.data,
      defaultData: {},
      ...props,
    },
  );
}
