import { useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';
import { BANK_QUERY_KEY } from '@/constants/query-keys/banking';

const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate settings.
  queryClient.invalidateQueries([t.SETTING, t.SETTING_CASHFLOW]);

  // Invalidate accounts.
  queryClient.invalidateQueries(t.ACCOUNTS);
  queryClient.invalidateQueries(t.ACCOUNT);

  // Invalidate account transactions.
  queryClient.invalidateQueries(t.ACCOUNT_TRANSACTION);

  // Invalidate cashflow accounts.
  queryClient.invalidateQueries(t.CASH_FLOW_ACCOUNTS);

  // Invalidate the cashflow transactions.
  queryClient.invalidateQueries(t.CASH_FLOW_TRANSACTIONS);
  queryClient.invalidateQueries(t.CASHFLOW_ACCOUNT_TRANSACTIONS_INFINITY);

  // Invalidate financial reports.
  queryClient.invalidateQueries(t.FINANCIAL_REPORT);
  queryClient.invalidateQueries(t.CASH_FLOW_TRANSACTION);

  // Invalidate mutate base currency abilities.
  queryClient.invalidateQueries(t.ORGANIZATION_MUTATE_BASE_CURRENCY_ABILITIES);
};

/**
 * Retrieve accounts list.
 */
// Оба довода необязательны: список счетов часто нужен «как есть», без отбора
// и настроек. Раньше они были обязательными, и такой вызов не сходился по
// типам (тот же класс, что чинили в картах v87–v88).
export function useCashflowAccounts(query?: any, props?: any) {
  return useRequestQuery(
    [t.CASH_FLOW_ACCOUNTS, query],
    { method: 'get', url: 'banking/accounts', params: query },
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Create Money in owner contribution .
 */
export function useCreateCashflowTransaction(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (values) => apiRequest.post('banking/transactions', values),
    {
      onSuccess: () => {
        // Invalidate queries.
        commonInvalidateQueries(queryClient);

        queryClient.invalidateQueries('BANK_TRANSACTION_MATCHES');
      },
      ...props,
    },
  );
}

/**
 * Retrieve account transactions list.
 */
export function useCashflowTransaction(id: any, props: any) {
  return useRequestQuery(
    [t.CASH_FLOW_TRANSACTIONS, id],
    { method: 'get', url: `banking/transactions/${id}` },
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Deletes the given sale invoice.
 */
export function useDeleteCashflowTransaction(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`banking/transactions/${id}`), {
    onSuccess: (res, id) => {
      // Invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/** Отборы списка операций по всем счетам (этап 3 ТЗ). */
export interface AllTransactionsFilters {
  /** Начало периода, `YYYY-MM-DD`. */
  fromDate?: string;
  /** Конец периода, `YYYY-MM-DD`. */
  toDate?: string;
  /** Счёт. Пусто — по всем счетам. */
  accountId?: number;
  /** Приход (`in`) или расход (`out`). */
  flow?: 'in' | 'out';
  /** Контрагент. */
  contactId?: number;
  /** Поиск по номеру, номеру-ссылке и назначению. */
  search?: string;
  /** Сумма от и до. */
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Список операций ПО ВСЕМ СЧЕТАМ с отборами.
 *
 * Отдельный крючок, а не довод к соседнему: отборы обязаны попадать в ключ
 * памяти запросов, иначе при смене периода показывался бы прошлый ответ.
 * У соседнего крючка ключ состоит только из счёта — там отборы не меняются.
 */
export function useAllTransactionsInfinity(
  filters: AllTransactionsFilters = {},
  infinityProps?: any,
) {
  const apiRequest = useApiRequest();

  // Пустые значения в запрос не отправляем: сервер отличает «не задано» от
  // «задано пустым», и пустая строка отбора отсекла бы все строки.
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

  return useInfiniteQuery(
    [t.ALL_TRANSACTIONS_INFINITY, params],
    async ({ pageParam = 1 }) => {
      const response = await apiRequest.http({
        method: 'get',
        url: `/api/banking/transactions`,
        params: { page: pageParam, page_size: 50, ...params },
      });
      return response.data;
    },
    {
      getNextPageParam: (lastPage: any) => {
        const { pagination } = lastPage;

        return pagination.total > pagination.page_size * pagination.page
          ? pagination.page + 1
          : undefined;
      },
      keepPreviousData: true,
      ...infinityProps,
    },
  );
}

/**
 * Retrieve account transactions infinity scrolling.
 * @param {number} accountId
 * @param {*} axios
 * @returns
 */
export function useAccountTransactionsInfinity(
  accountId: any,
  query: any,
  infinityProps?: any,
  axios?: any,
) {
  const apiRequest = useApiRequest();

  return useInfiniteQuery(
    [t.CASHFLOW_ACCOUNT_TRANSACTIONS_INFINITY, accountId],
    async ({ pageParam = 1 }) => {
      const response = await apiRequest.http({
        ...axios,
        method: 'get',
        url: `/api/banking/transactions`,
        params: { page: pageParam, ...query },
      });
      return response.data;
    },
    {
      getPreviousPageParam: (firstPage) => firstPage.pagination.page - 1,
      getNextPageParam: (lastPage) => {
        const { pagination } = lastPage;

        return pagination.total > pagination.page_size * pagination.page
          ? lastPage.pagination.page + 1
          : undefined;
      },
      ...infinityProps,
    },
  );
}

/**
 * Retrieve account transactions infinity scrolling.
 * @param {number} accountId
 * @param {*} axios
 * @returns
 */
/**
 * Операции, ждущие разноски, ПО ВСЕМ СЧЕТАМ.
 *
 * Полоса «N операций без статьи» на экране «Операции» и режим разноски
 * (этап 3 ТЗ). Раньше такой список существовал только внутри одного счёта.
 */
export function useAllUncategorizedInfinity(
  filters: { fromDate?: string; toDate?: string; accountId?: number } = {},
  infinityProps?: any,
) {
  const apiRequest = useApiRequest();

  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

  return useInfiniteQuery(
    [t.ALL_UNCATEGORIZED_INFINITY, params],
    async ({ pageParam = 1 }) => {
      const response = await apiRequest.http({
        method: 'get',
        url: `/api/banking/uncategorized`,
        params: { page: pageParam, page_size: 50, ...params },
      });
      return response.data;
    },
    {
      getNextPageParam: (lastPage: any) => {
        const { pagination } = lastPage;

        return pagination.total > pagination.page_size * pagination.page
          ? pagination.page + 1
          : undefined;
      },
      keepPreviousData: true,
      ...infinityProps,
    },
  );
}

export function useAccountUncategorizedTransactionsInfinity(
  accountId: any,
  query: any,
  infinityProps?: any,
  axios?: any,
) {
  const apiRequest = useApiRequest();

  return useInfiniteQuery(
    [t.CASHFLOW_ACCOUNT_UNCATEGORIZED_TRANSACTIONS_INFINITY, accountId, query],
    async ({ pageParam = 1 }) => {
      const response = await apiRequest.http({
        ...axios,
        method: 'get',
        url: `/api/banking/uncategorized/accounts/${accountId}`,
        params: { page: pageParam, ...query },
      });
      return response.data;
    },
    {
      getPreviousPageParam: (firstPage) => firstPage.pagination.page - 1,
      getNextPageParam: (lastPage) => {
        const { pagination } = lastPage;

        return pagination.total > pagination.page_size * pagination.page
          ? lastPage.pagination.page + 1
          : undefined;
      },
      ...infinityProps,
    },
  );
}

/**
 * Refresh cashflow accounts.
 */
export function useRefreshCashflowAccounts() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.CASH_FLOW_ACCOUNTS);
    },
  };
}

/**
 * Refresh the cshflow account transactions.
 */
export function useRefreshCashflowTransactions() {
  const query = useQueryClient();

  return {
    refresh: (accountId: number) => {
      query.invalidateQueries(t.CASHFLOW_ACCOUNT_TRANSACTIONS_INFINITY);
      query.invalidateQueries(
        t.CASHFLOW_ACCOUNT_UNCATEGORIZED_TRANSACTIONS_INFINITY,
      );
      query.invalidateQueries(
        BANK_QUERY_KEY.RECOGNIZED_BANK_TRANSACTIONS_INFINITY,
      );
      query.invalidateQueries(
        BANK_QUERY_KEY.EXCLUDED_BANK_TRANSACTIONS_INFINITY,
      );
      query.invalidateQueries(
        BANK_QUERY_KEY.PENDING_BANK_ACCOUNT_TRANSACTIONS_INFINITY,
      );
      query.invalidateQueries([
        BANK_QUERY_KEY.BANK_ACCOUNT_SUMMARY_META,
        accountId,
      ]);
      query.invalidateQueries([t.ACCOUNT, accountId]);
    },
  };
}

/**
 * Retrieves specific uncategorized transaction.
 * @param {number} uncategorizedTranasctionId -
 */
export function useUncategorizedTransaction(
  uncategorizedTranasctionId: number,
  props: any,
) {
  return useRequestQuery(
    [t.CASHFLOW_UNCAATEGORIZED_TRANSACTION, uncategorizedTranasctionId],
    {
      method: 'get',
      url: `banking/uncategorized/${uncategorizedTranasctionId}`,
    },
    {
      select: (res: any) => res.data?.data,
      ...props,
    },
  );
}

/**
 * Categorize the cashflow transaction.
 */
export function useCategorizeTransaction(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (values) => apiRequest.post(`banking/categorize`, values),
    {
      onSuccess: (res, id) => {
        // Invalidate queries.
        commonInvalidateQueries(queryClient);
        queryClient.invalidateQueries(t.CASHFLOW_UNCAATEGORIZED_TRANSACTION);
        queryClient.invalidateQueries(
          t.CASHFLOW_ACCOUNT_UNCATEGORIZED_TRANSACTIONS_INFINITY,
        );

        // Invalidate bank account summary.
        queryClient.invalidateQueries('BANK_ACCOUNT_SUMMARY_META');
      },
      ...props,
    },
  );
}

/**
 * Uncategorize the cashflow transaction.
 */
export function useUncategorizeTransaction(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (id: number) => apiRequest.delete(`banking/categorize/${id}`),
    {
      onSuccess: (res, id) => {
        // Invalidate queries.
        commonInvalidateQueries(queryClient);
        queryClient.invalidateQueries(t.CASHFLOW_UNCAATEGORIZED_TRANSACTION);
        queryClient.invalidateQueries(
          t.CASHFLOW_ACCOUNT_UNCATEGORIZED_TRANSACTIONS_INFINITY,
        );
        // Invalidate bank account summary.
        queryClient.invalidateQueries('BANK_ACCOUNT_SUMMARY_META');
      },
      ...props,
    },
  );
}
