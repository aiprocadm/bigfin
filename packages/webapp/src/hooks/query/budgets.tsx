import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';
import {
  mapBudget,
  mapBudgets,
  mapPlanFact,
} from '@/containers/Budgets/mapBudget';
import { unwrapData } from '@/utils/unwrapData';

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
    // Ответы приходят в snake_case — приводим к виду, привычному страницам.
    { select: (res: any) => mapBudgets(unwrapData(res)), defaultData: [], ...props },
  );
}

export function useBudget(id: number | string, props?: any) {
  return useRequestQuery(
    [t.BUDGET, id],
    { method: 'get', url: `budgets/${id}` },
    { select: (res: any) => mapBudget(res.data), defaultData: {}, ...props },
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
    { select: (res: any) => mapPlanFact(res.data), defaultData: { rows: [] }, ...props },
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

/** Денежный план по месяцам с привязкой остатка (FT-056 ТЗ-3). */
export function useBudgetCashPlan(id: number | undefined, query: Record<string, unknown>, props?: any) {
  return useRequestQuery(
    [t.BUDGETS, 'cash-plan', id, query],
    { method: 'get', url: `budgets/${id}/cash-plan`, params: query },
    { select: (res: any) => res.data, defaultData: null, enabled: !!id, ...props },
  );
}

/** Автозаполнение бюджета из истории: предпросмотр и запись (FT-054 ТЗ-3). */
export function useBudgetAutofill() {
  const client = useQueryClient();
  const api: any = useApiRequest();
  const preview = useMutation(({ id, body }: { id: number; body: Record<string, unknown> }) =>
    api.post(`budgets/${id}/autofill/preview`, body).then((res: any) => res.data),
  );
  const apply = useMutation(
    ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.post(`budgets/${id}/autofill`, body).then((res: any) => res.data),
    { onSuccess: () => invalidate(client) },
  );
  return { preview, apply };
}

