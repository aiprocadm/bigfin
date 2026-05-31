import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface BudgetValues {
  name: string;
  type: 'bdir' | 'bdds';
  fiscalYear: number;
  activeScenario?: string;
  branchId?: number | null;
}
export interface BudgetLineInput {
  articleId: number;
  period: string;
  scenario: string;
  plannedAmount: number;
}
export type EditBudgetArgs = [number | string, BudgetValues];
export type UpsertLinesArgs = [number | string, { lines: BudgetLineInput[] }];

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.BUDGETS);
  client.invalidateQueries(t.BUDGET);
  client.invalidateQueries(t.BUDGET_PLAN_FACT);
};

export function useBudgets(props?: any) {
  return useRequestQuery(
    [t.BUDGETS],
    { method: 'get', url: 'budgets' },
    { select: (res: any) => res.data.data, defaultData: [], ...props },
  );
}

export function useBudget(id: number | string, props?: any) {
  return useRequestQuery(
    [t.BUDGET, id],
    { method: 'get', url: `budgets/${id}` },
    { select: (res: any) => res.data, defaultData: {}, ...props },
  );
}

export function useBudgetPlanFact(
  id: number | string,
  query?: any,
  props?: any,
) {
  return useRequestQuery(
    [t.BUDGET_PLAN_FACT, id, query],
    { method: 'get', url: `budgets/${id}/plan-fact`, params: query },
    { select: (res: any) => res.data, defaultData: { rows: [] }, ...props },
  );
}

export function useCreateBudget(
  props?: UseMutationOptions<any, any, BudgetValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, BudgetValues>(
    (values) => api.post('budgets', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditBudget(
  props?: UseMutationOptions<any, any, EditBudgetArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, EditBudgetArgs>(
    ([id, values]) => api.put(`budgets/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useUpsertBudgetLines(
  props?: UseMutationOptions<any, any, UpsertLinesArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, UpsertLinesArgs>(
    ([id, payload]) => api.put(`budgets/${id}/lines`, payload),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteBudget(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.delete(`budgets/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
