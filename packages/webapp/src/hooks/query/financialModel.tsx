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

export interface MarginPoint {
  month: string;
  revenue: number;
  profit: number;
  margin: number;
}

export interface FinancialOverview {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  employeeCount: number;
  revenuePerEmployee: number;
  revenuePerEmployeeApplicable: boolean;
  marginOverTime: MarginPoint[];
}

/** Обзор финмодели за период (fromDate/toDate в query). */
export function useFinancialOverview(query?: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_OVERVIEW, query],
    { method: 'get', url: 'financial-model/overview', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        revenue: 0,
        costs: 0,
        profit: 0,
        margin: 0,
        employeeCount: 0,
        revenuePerEmployee: 0,
        revenuePerEmployeeApplicable: false,
        marginOverTime: [],
      } as FinancialOverview,
      ...props,
    },
  );
}

// ---------------------------------------------------------------------------
// Сегменты рентабельности — Фаза 2
// ---------------------------------------------------------------------------

export interface SegmentRow {
  id: number;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

export interface ProductMarginItem {
  itemId: number;
  name: string;
  revenue: number;
  cost: number;
  grossMargin: number;
  margin: number;
}

export interface SegmentProfitability {
  byDeal: SegmentRow[];
  byManager: SegmentRow[];
  byBranch: SegmentRow[];
  byProduct: ProductMarginItem[];
}

/** Рентабельность по сегментам за период (fromDate/toDate в query). */
export function useFinancialSegments(query?: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_SEGMENTS, query],
    { method: 'get', url: 'financial-model/segments', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        byDeal: [],
        byManager: [],
        byBranch: [],
        byProduct: [],
      } as SegmentProfitability,
      ...props,
    },
  );
}

// ---------------------------------------------------------------------------
// Маркетинг (CAC / ROMI / LTV) — Фаза 3
// ---------------------------------------------------------------------------

export interface MetricValue {
  value: number;
  applicable: boolean;
}

export interface MarketingChannelMetric {
  channelId: number;
  name: string;
  spend: number;
  newCustomers: number;
  cac: MetricValue;
}

export interface MarketingMetrics {
  revenue: number;
  margin: number;
  totalSpend: number;
  totalNewCustomers: number;
  customerCount: number;
  customerLifetimeMonths: number;
  averageCheck: MetricValue;
  cacTotal: MetricValue;
  romi: MetricValue;
  ltv: MetricValue;
  channels: MarketingChannelMetric[];
  hasData: boolean;
}

export interface MarketingChannel {
  id: number;
  name: string;
  active: boolean;
}

const naMetric: MetricValue = { value: 0, applicable: false };

/** Маркетинговые метрики за период (CAC/ROMI/LTV по каналам и итого). */
export function useMarketingMetrics(query?: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_MARKETING, query],
    { method: 'get', url: 'financial-model/marketing', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        revenue: 0,
        margin: 0,
        totalSpend: 0,
        totalNewCustomers: 0,
        customerCount: 0,
        customerLifetimeMonths: 0,
        averageCheck: naMetric,
        cacTotal: naMetric,
        romi: naMetric,
        ltv: naMetric,
        channels: [],
        hasData: false,
      } as MarketingMetrics,
      ...props,
    },
  );
}

/** Список каналов привлечения. */
export function useMarketingChannels(props?: any) {
  return useRequestQuery(
    [t.MARKETING_CHANNELS],
    { method: 'get', url: 'financial-model/marketing/channels' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: [] as MarketingChannel[],
      ...props,
    },
  );
}

const invalidateMarketing = (client: QueryClient) => {
  client.invalidateQueries(t.FINANCIAL_MARKETING);
  client.invalidateQueries(t.MARKETING_CHANNELS);
};

/** Создать канал привлечения. */
export function useCreateMarketingChannel(
  props?: UseMutationOptions<any, any, { name: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { name: string }>(
    (values) => api.post('financial-model/marketing/channels', values),
    { onSuccess: () => invalidateMarketing(client), ...props },
  );
}

export type UpdateChannelArgs = [
  number,
  { name?: string; active?: boolean },
];

/** Изменить канал (название/активность). */
export function useUpdateMarketingChannel(
  props?: UseMutationOptions<any, any, UpdateChannelArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, UpdateChannelArgs>(
    ([id, values]) =>
      api.put(`financial-model/marketing/channels/${id}`, values),
    { onSuccess: () => invalidateMarketing(client), ...props },
  );
}

/** Удалить канал. */
export function useDeleteMarketingChannel(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.delete(`financial-model/marketing/channels/${id}`),
    { onSuccess: () => invalidateMarketing(client), ...props },
  );
}

export interface UpsertMonthlyValues {
  channelId: number;
  month: string;
  spend: number;
  newCustomers: number;
}

/** Сохранить помесячные расход/новых клиентов по каналу. */
export function useUpsertMarketingMonthly(
  props?: UseMutationOptions<any, any, UpsertMonthlyValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, UpsertMonthlyValues>(
    (values) => api.put('financial-model/marketing/monthly', values),
    { onSuccess: () => invalidateMarketing(client), ...props },
  );
}

/** Задать средний срок жизни клиента (мес.). */
export function useSetCustomerLifetime(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (months) => api.put('financial-model/marketing/lifetime', { months }),
    { onSuccess: () => invalidateMarketing(client), ...props },
  );
}

// ---------------------------------------------------------------------------
// Точка безубыточности — Фаза 4
// ---------------------------------------------------------------------------

export interface BreakEvenResult {
  revenue: number;
  margin: number;
  fixedCosts: number;
  breakEven: MetricValue;
  hasFixedArticles: boolean;
}

/** Точка безубыточности за период (постоянные затраты, маржа, выручка безубыточности). */
export function useBreakEven(query?: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_BREAK_EVEN, query],
    { method: 'get', url: 'financial-model/break-even', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        revenue: 0,
        margin: 0,
        fixedCosts: 0,
        breakEven: naMetric,
        hasFixedArticles: false,
      } as BreakEvenResult,
      ...props,
    },
  );
}

export interface ExpenseArticle {
  id: number;
  name: string;
  parentId: number | null;
  costBehavior: 'fixed' | 'variable' | null;
}

/** Расходные статьи с пометкой постоянная/переменная (для безубыточности). */
export function useExpenseArticles(props?: any) {
  return useRequestQuery(
    [t.EXPENSE_ARTICLES],
    { method: 'get', url: 'financial-model/articles' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: [] as ExpenseArticle[],
      ...props,
    },
  );
}

export type SetCostBehaviorArgs = [
  number,
  'fixed' | 'variable' | null,
];

/** Пометить статью постоянной/переменной (или снять пометку — null). */
export function useSetCostBehavior(
  props?: UseMutationOptions<any, any, SetCostBehaviorArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, SetCostBehaviorArgs>(
    ([id, behavior]) =>
      api.put(`financial-model/articles/${id}/cost-behavior`, { behavior }),
    {
      onSuccess: () => {
        client.invalidateQueries(t.EXPENSE_ARTICLES);
        client.invalidateQueries(t.FINANCIAL_BREAK_EVEN);
      },
      ...props,
    },
  );
}
