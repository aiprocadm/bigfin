// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface DividendsSummary {
  netProfit: number;
  totalPaidOut: number;
  available: number;
  unpaidBills: number;
  safe: number;
}

export interface DividendPayoutRow {
  id: number;
  date: string;
  amount: number;
  paymentAccountId: number;
  paymentAccountName: string | null;
  note: string | null;
}

export interface CreateDividendPayoutValues {
  date: string;
  amount: number;
  paymentAccountId: number;
  note?: string;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.DIVIDENDS_SUMMARY);
  client.invalidateQueries(t.DIVIDENDS_PAYOUTS);
  // Выплата пишет GL-проводки — обновляем счета и отчёты.
  client.invalidateQueries(t.ACCOUNTS);
  client.invalidateQueries(t.FINANCIAL_REPORT);
};

/** Сводка: чистая прибыль, выведено, доступно, кредиторка, безопасно. */
export function useDividendsSummary(props?: any) {
  return useRequestQuery(
    [t.DIVIDENDS_SUMMARY],
    { method: 'get', url: 'dividends/summary' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        netProfit: 0,
        totalPaidOut: 0,
        available: 0,
        unpaidBills: 0,
        safe: 0,
      },
      ...props,
    },
  );
}

/** История выплат собственнику (новые сверху). */
export function useDividendPayouts(props?: any) {
  return useRequestQuery(
    [t.DIVIDENDS_PAYOUTS],
    { method: 'get', url: 'dividends/payouts' },
    {
      select: (res: any) => {
        const payload = res.data?.data ?? res.data;
        return payload?.payouts ?? [];
      },
      defaultData: [],
      ...props,
    },
  );
}

export function useCreateDividendPayout(
  props?: UseMutationOptions<any, any, CreateDividendPayoutValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, CreateDividendPayoutValues>(
    (values) => api.post('dividends/payouts', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteDividendPayout(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.delete(`dividends/payouts/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
