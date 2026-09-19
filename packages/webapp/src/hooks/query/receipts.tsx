// @ts-nocheck
// ОСТАЛОСЬ 2 ЗАМЕЧАНИЯ (слой хуков запросов, 19.09). Было 16.
// Оставшееся: у чека в HTML объявлен свой вид ответа, и он спорит с
// тем, что отдаёт общий помощник запросов. Чинится вместе с ним, а не
// здесь.
import {
  useQueryClient,
  useMutation,
  UseQueryResult,
  UseQueryOptions,
  useQuery,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import { transformPagination, transformToCamelCase } from '@/utils';
import { useRequestPdf } from '../useRequestPdf';
import t from './types';
import { unwrapData } from '@/utils/unwrapData';
import type {
  QueryCacheClient,
  QueryHookOptions,
} from './hookTypes';

/** Ответ сервера: разбирается прямо в хуке. */
type ApiResponse = { data: any };

const commonInvalidateQueries = (queryClient: QueryCacheClient) => {
  // Invalidate receipts.
  queryClient.invalidateQueries(t.SALE_RECEIPTS);

  // Invalidate accounts.
  queryClient.invalidateQueries(t.ITEMS);
  queryClient.invalidateQueries(t.ITEM);

  // Invalidate accounts.
  queryClient.invalidateQueries(t.ACCOUNTS);
  queryClient.invalidateQueries(t.ACCOUNT);

  // Invalidate financial reports.
  queryClient.invalidateQueries(t.FINANCIAL_REPORT);

  // Invalidate the transactions by reference.
  queryClient.invalidateQueries(t.TRANSACTIONS_BY_REFERENCE);

  // Invalidate the cashflow transactions.
  queryClient.invalidateQueries(t.CASH_FLOW_TRANSACTIONS);
  queryClient.invalidateQueries(t.CASHFLOW_ACCOUNT_TRANSACTIONS_INFINITY);

  // Invalidate
  queryClient.invalidateQueries(t.ITEM_ASSOCIATED_WITH_RECEIPTS);

  // Invalidate item warehouses.
  queryClient.invalidateQueries(t.ITEM_WAREHOUSES_LOCATION);

  // Invalidate the settings.
  queryClient.invalidateQueries([t.SETTING, t.SETTING_RECEIPTS]);

  // Invalidate mutate base currency abilities.
  queryClient.invalidateQueries(t.ORGANIZATION_MUTATE_BASE_CURRENCY_ABILITIES);
};

/**
 * Creates a new sale invoice.
 */
export function useCreateReceipt(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values: any) => apiRequest.post('sale-receipts', values), {
    onSuccess: () => {
      // Invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Edits the given sale invoice.
 */
export function useEditReceipt(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`sale-receipts/${id}`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Invalidate specific receipt.
        queryClient.invalidateQueries([t.SALE_RECEIPT, id]);

        // Invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Deletes the given sale invoice.
 */
export function useDeleteReceipt(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`sale-receipts/${id}`), {
    onSuccess: (res, id) => {
      // Invalidate specific receipt.
      queryClient.invalidateQueries([t.SALE_RECEIPT, id]);

      // Invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Deletes multiple receipts in bulk.
 */
export function useBulkDeleteReceipts(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ({
      ids,
      skipUndeletable = false,
    }: {
      ids: number[];
      skipUndeletable?: boolean;
    }) =>
      apiRequest.post('sale-receipts/bulk-delete', {
        ids,
        skip_undeletable: skipUndeletable,
      }),
    {
      onSuccess: () => {
        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

export function useValidateBulkDeleteReceipts(props?: QueryHookOptions) {
  const apiRequest = useApiRequest();

  return useMutation(
    (ids: number[]) =>
      apiRequest
        .post('sale-receipts/validate-bulk-delete', { ids })
        .then((res: ApiResponse) => transformToCamelCase(res.data)),
    {
      ...props,
    },
  );
}

/**
 * Deletes the given sale invoice.
 */
export function useCloseReceipt(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.post(`sale-receipts/${id}/close`), {
    onSuccess: (res, id) => {
      queryClient.invalidateQueries([t.SALE_RECEIPT, id]);

      // Invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

const transformReceipts = (res: ApiResponse) => ({
  receipts: unwrapData(res),
  pagination: transformPagination(res.data.pagination),
  filterMeta: res.data.filter_meta,
});

/**
 * Retrieve sale invoices list with pagination meta.
 */
export function useReceipts(query?: Record<string, any>, props?: QueryHookOptions) {
  return useRequestQuery(
    ['SALE_RECEIPTS', query],
    { method: 'get', url: 'sale-receipts', params: query },
    {
      select: transformReceipts,
      defaultData: {
        receipts: [],
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
 * Retrieve sale invoices list with pagination meta.
 */
export function useReceipt(id: number | string | null | undefined, props?: QueryHookOptions) {
  return useRequestQuery(
    ['SALE_RECEIPT', id],
    { method: 'get', url: `sale-receipts/${id}` },
    {
      select: (res: ApiResponse) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

/**
 * Retrieve the receipt pdf document data.
 * @param {number} receiptId -
 */
export function usePdfReceipt(receiptId: number) {
  return useRequestPdf({ url: `sale-receipts/${receiptId}` });
}

export function useRefreshReceipts() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.SALE_RECEIPTS);
    },
  };
}

/**
 *
 */
export function useSendSaleReceiptMail(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.post(`sale-receipts/${id}/mail`, values),
    {
      onSuccess: () => {
        // Invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

export interface GetSaleReceiptMailStateResponse {
  attachReceipt: boolean;

  closedAtDate: string;
  closedAtDateFormatted: string;

  companyName: string;
  customerName: string;

  formatArgs: Record<string, any>;

  from: string[];
  fromOptions: Array<{ mail: string; label: string; primary: boolean; }>;
  message: string;

  receiptDate: string;
  receiptDateFormatted: string;

  subject: string;

  subtotal: number;
  subtotalFormatted: string;

  to: string[];
  toOptions: Array<{ mail: string; label: string; primary: boolean; }>;

  // # Discount
  discountAmount: number;
  discountAmountFormatted: string;
  discountLabel: string;
  discountPercentage: number | null;
  discountPercentageFormatted: string;

  // # Adjustment
  adjustment: number,
  adjustmentFormatted: string,

  // # Total
  total: number;
  totalFormatted: string;

  companyLogoUri?: string | null;
  primaryColor?: string | null;

  entries: Array<{
    name: string;
    quantity: number;
    quantityFormatted: string;
    rate: number;
    rateFormatted: string;
    total: number;
    totalFormatted: string
  }>,
  receiptNumber: string;
}

export function useSaleReceiptMailState(
  receiptId: number,
  props?: UseQueryOptions<GetSaleReceiptMailStateResponse, Error>,
): UseQueryResult<GetSaleReceiptMailStateResponse, Error> {
  const apiRequest = useApiRequest();

  return useQuery<GetSaleReceiptMailStateResponse, Error>(
    [t.SALE_RECEIPT_MAIL_OPTIONS, receiptId],
    () =>
      apiRequest
        .get(`sale-receipts/${receiptId}/mail`)
        .then((res: ApiResponse) => transformToCamelCase(res.data)),
  );
}

export interface IGetReceiptStateResponse {
  defaultTemplateId: number;
}

export function useGetReceiptState(
  options?: UseQueryOptions<IGetReceiptStateResponse, Error>,
): UseQueryResult<IGetReceiptStateResponse, Error> {
  const apiRequest = useApiRequest();

  return useQuery<IGetReceiptStateResponse, Error>(
    ['SALE_RECEIPT_STATE'],
    () =>
      apiRequest
        .get(`/sale-receipts/state`)
        .then((res: ApiResponse) => transformToCamelCase(res.data)),
    { ...options },
  );
}

interface GetReceiptHtmlResponse {
  htmlContent: string;
}

/**
 * Retrieves the sale receipt html content.
 * @param {number} receiptId
 * @param {UseQueryOptions<string, Error>} options
 * @returns {UseQueryResult<GetReceiptHtmlResponse, Error>}
 */
export const useGetSaleReceiptHtml = (
  receiptId: number,
  options?: UseQueryOptions<string, Error>,
): UseQueryResult<GetReceiptHtmlResponse, Error> => {
  const apiRequest = useApiRequest();

  return useQuery<GetReceiptHtmlResponse, Error>(
    ['SALE_RECEIPT_HTML', receiptId],
    () =>
      apiRequest
        .get(`sale-receipts/${receiptId}`, {
          headers: {
            Accept: 'application/json+html',
          },
        })
        .then((res: ApiResponse) => transformToCamelCase(res.data)),
    { ...options },
  );
};
