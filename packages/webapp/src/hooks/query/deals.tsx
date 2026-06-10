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

export interface DealValues {
  name: string;
  contactId?: number | null;
  deadline?: string | null;
  costEstimate?: number | null;
  status?: string;
  managerId?: number | null;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.DEALS);
  client.invalidateQueries(t.DEAL);
  client.invalidateQueries(t.DEAL_SUMMARY);
  client.invalidateQueries(t.DEAL_PROFITABILITY);
};

/** List deals (optional status filter). */
export function useDeals(query?: any, props?: any) {
  return useRequestQuery(
    [t.DEALS, query],
    { method: 'get', url: 'deals', params: query },
    { select: (res: any) => res.data.data, defaultData: [], ...props },
  );
}

/** A single deal. */
export function useDeal(id: number | string, props?: any) {
  return useRequestQuery(
    [t.DEAL, id],
    { method: 'get', url: `deals/${id}` },
    { select: (res: any) => res.data, defaultData: {}, enabled: !!id, ...props },
  );
}

/** Dashboard summary (per-deal margins + totals). */
export function useDealsSummary(query?: any, props?: any) {
  return useRequestQuery(
    [t.DEAL_SUMMARY, query],
    { method: 'get', url: 'deals/summary', params: query },
    {
      select: (res: any) => res.data,
      defaultData: { deals: [], totals: { revenue: 0, costs: 0, profit: 0 } },
      ...props,
    },
  );
}

/** Profitability of a single deal. */
export function useDealProfitability(id: number | string, query?: any, props?: any) {
  return useRequestQuery(
    [t.DEAL_PROFITABILITY, id, query],
    { method: 'get', url: `deals/${id}/profitability`, params: query },
    { select: (res: any) => res.data, defaultData: {}, enabled: !!id, ...props },
  );
}

export function useCreateDeal(props?: UseMutationOptions<any, any, DealValues>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, DealValues>(
    (values) => api.post('deals', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditDeal(
  props?: UseMutationOptions<any, any, [number | string, DealValues]>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, [number | string, DealValues]>(
    ([id, values]) => api.put(`deals/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteDeal(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.delete(`deals/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
