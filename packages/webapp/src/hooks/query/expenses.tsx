import { useMutation, useQueryClient } from 'react-query';
import useApiRequest from '../useRequest';
import { useRequestQuery } from '../useQueryRequest';
import { transformPagination, transformToCamelCase } from '@/utils';
import t from './types';

const defaultPagination = {
  pageSize: 20,
  page: 0,
  pagesCount: 0,
};

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate expenses.
  queryClient.invalidateQueries(t.EXPENSES);

  // Invalidate accounts.
  queryClient.invalidateQueries(t.ACCOUNTS);
  queryClient.invalidateQueries(t.ACCOUNT);

  // Invalidate financial reports.
  queryClient.invalidateQueries(t.FINANCIAL_REPORT);

  // Invalidate the cashflow transactions.
  queryClient.invalidateQueries(t.CASH_FLOW_TRANSACTIONS);
  queryClient.invalidateQueries(t.CASHFLOW_ACCOUNT_TRANSACTIONS_INFINITY);

  // Invalidate landed cost.
  queryClient.invalidateQueries(t.LANDED_COST);
  queryClient.invalidateQueries(t.LANDED_COST_TRANSACTION);

  // Invalidate mutate base currency abilities.
  queryClient.invalidateQueries(t.ORGANIZATION_MUTATE_BASE_CURRENCY_ABILITIES);
};

const transformExpenses = (response: any) => ({
  expenses: response.data.expenses,
  pagination: transformPagination(response.data.pagination),
  filterMeta: response.data.filter_meta,
});

/**
 * Retrieve the expenses list.
 */
export function useExpenses(query: any, props: any) {
  return useRequestQuery(
    [t.EXPENSES, query],
    {
      method: 'get',
      url: `expenses`,
      params: { ...query },
    },
    {
      select: transformExpenses,
      defaultData: {
        expenses: [],
        pagination: defaultPagination,
        filterMeta: {},
      },
      ...props,
    },
  );
}

/**
 * Retrieve the expense details.
 * @param {number} id - Expense id.
 */
export function useExpense(id: any, props: any) {
  return useRequestQuery(
    [t.EXPENSE, id],
    {
      method: 'get',
      url: `expenses/${id}`,
    },
    {
      select: (res: any) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

/**
 * Deletes the given expense.
 */
export function useDeleteExpense(props: any) {
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();

  return useMutation((id) => apiRequest.delete(`expenses/${id}`), {
    onSuccess: (res, id) => {
      // Invalidate specific expense.
      queryClient.invalidateQueries([t.EXPENSE, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Deletes multiple expenses in bulk.
 */
export function useBulkDeleteExpenses(props: any) {
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
      apiRequest.post('expenses/bulk-delete', {
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

export function useValidateBulkDeleteExpenses(props: any) {
  const apiRequest = useApiRequest();

  return useMutation(
    (ids: number[]) =>
      apiRequest
        .post('expenses/validate-bulk-delete', { ids })
        .then((res) => transformToCamelCase(res.data)),
    {
      ...props,
    },
  );
}

/**
 * Edits the given expense.
 */
export function useEditExpense(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`expenses/${id}`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Invalidate specific expense.
        queryClient.invalidateQueries([t.EXPENSE, id]);

        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Creates the new expense.
 */
export function useCreateExpense(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values) => apiRequest.post('expenses', values), {
    onSuccess: () => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Publishes the given expense.
 */
export function usePublishExpense(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.post(`expenses/${id}/publish`), {
    onSuccess: (res, id) => {
      // Invalidate specific expense.
      queryClient.invalidateQueries([t.EXPENSE, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

export function useRefreshExpenses() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.EXPENSES);
    },
  };
}
