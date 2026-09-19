import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import { transformPagination, transformToCamelCase } from '@/utils';
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
  // Invalidate manual journals.
  client.invalidateQueries(t.MANUAL_JOURNALS);

  // Invalidate customers.
  client.invalidateQueries(t.CUSTOMERS);
  client.invalidateQueries(t.CUSTOMER);

  // Invalidate vendors.
  client.invalidateQueries(t.VENDORS);
  client.invalidateQueries(t.VENDOR);

  // Invalidate accounts.
  client.invalidateQueries(t.ACCOUNTS);
  client.invalidateQueries(t.ACCOUNT);

  // Invalidate settings.
  client.invalidateQueries([t.SETTING, t.SETTING_MANUAL_JOURNALS]);

  // Invalidate financial reports.
  client.invalidateQueries(t.FINANCIAL_REPORT);

  // Invalidate the cashflow transactions.
  client.invalidateQueries(t.CASH_FLOW_TRANSACTIONS);
  client.invalidateQueries(t.CASHFLOW_ACCOUNT_TRANSACTIONS_INFINITY);
};

/**
 * Creates a new manual journal.
 */
export function useCreateJournal(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values: any) => apiRequest.post('manual-journals', values), {
    onSuccess: () => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Edits the given manual journal.
 */
export function useEditJournal(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`manual-journals/${id}`, values),
    {
      onSuccess: (res, [id]) => {
        // Invalidate specific manual journal.
        queryClient.invalidateQueries([t.MANUAL_JOURNAL, id]);

        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Deletes the given manual jouranl.
 */
export function useDeleteJournal(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`manual-journals/${id}`), {
    onSuccess: (res, id) => {
      // Invalidate specific manual journal.
      queryClient.invalidateQueries([t.MANUAL_JOURNAL, id]);

      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Deletes multiple manual journals in bulk.
 */
export function useBulkDeleteManualJournals(props?: QueryHookOptions) {
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
      apiRequest.post('manual-journals/bulk-delete', {
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

export function useValidateBulkDeleteManualJournals(props?: QueryHookOptions) {
  const apiRequest = useApiRequest();

  return useMutation(
    (ids: number[]) =>
      apiRequest
        .post('manual-journals/validate-bulk-delete', { ids })
        .then((res: ApiResponse) => transformToCamelCase(res.data)),
    {
      ...props,
    },
  );
}

/**
 * Publishes the given manual journal.
 */
export function usePublishJournal(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.patch(`manual-journals/${id}/publish`), {
    onSuccess: (res, id) => {
      // Invalidate specific manual journal.
      queryClient.invalidateQueries([t.MANUAL_JOURNAL, id]);

      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

const transformJournals = (response: ApiResponse) => ({
  manualJournals: response.data.manual_journals,
  pagination: transformPagination(response.data.pagination),
  filterMeta: response.data.filter_meta,
});

/**
 * Retrieve the manual journals with pagination meta.
 */
export function useJournals(query?: Record<string, any>, props?: QueryHookOptions) {
  return useRequestQuery(
    [t.MANUAL_JOURNALS, query],
    { method: 'get', url: 'manual-journals', params: query },
    {
      select: transformJournals,
      defaultData: {
        manualJournals: [],
        pagination: {},
        filterMeta: {},
      },
      ...props,
    },
  );
}

/**
 * Retrieve the manual journal details.
 */
export function useJournal(id: number | string | null | undefined, props?: QueryHookOptions) {
  return useRequestQuery(
    [t.MANUAL_JOURNAL, id],
    { method: 'get', url: `manual-journals/${id}` },
    {
      select: (res: ApiResponse) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

export function useRefreshJournals() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.MANUAL_JOURNALS);
    },
  };
}
