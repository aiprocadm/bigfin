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
import { unwrapData } from '@/utils/unwrapData';

export interface CostAllocationRuleValues {
  name: string;
  sourceArticleId: number;
  allocationKey:
    | 'revenue'
    | 'production_payroll'
    | 'gross_profit_1'
    | 'equal'
    | 'manual_share';
  /** Между кем делится пул (FT-011 ТЗ-3). */
  targetType?: 'deal' | 'direction';
  manualShares?: Record<string, number>;
  targetDealIds?: number[];
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.COST_ALLOCATION_RULES);
};

/** List cost allocation rules. */
export function useCostAllocationRules(query?: any, props?: any) {
  return useRequestQuery(
    [t.COST_ALLOCATION_RULES, query],
    { method: 'get', url: 'cost-allocation-rules', params: query },
    { select: (res: any) => unwrapData(res), defaultData: [], ...props },
  );
}

export function useCreateRule(
  props?: UseMutationOptions<any, any, CostAllocationRuleValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, CostAllocationRuleValues>(
    (values) => api.post('cost-allocation-rules', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditRule(
  props?: UseMutationOptions<any, any, [number | string, CostAllocationRuleValues]>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, [number | string, CostAllocationRuleValues]>(
    ([id, values]) => api.put(`cost-allocation-rules/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteRule(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.delete(`cost-allocation-rules/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
