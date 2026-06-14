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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FixedAssetsSummary {
  count: number;
  grossValue: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export interface FixedAssetScheduleEntry {
  period: string;
  amount: number;
  status: 'planned' | 'posted';
}

export interface FixedAssetRow {
  id: number;
  name: string;
  category: string | null;
  cost: number;
  salvageValue: number;
  lifeMonths: number;
  commissionedAt: string;
  assetAccountId: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: 'active' | 'disposed';
  schedule?: FixedAssetScheduleEntry[];
}

export interface CreateFixedAssetValues {
  name: string;
  category?: string;
  cost: number;
  salvageValue?: number;
  serviceLifeMonths: number;
  commissionedAt: string;
  assetAccountId: number;
  note?: string;
}

export interface AccrueMonthValues {
  period: string; // ISO date, e.g. "2026-06-01"
}

export interface DisposeFixedAssetValues {
  disposalType: 'sale' | 'liquidation';
  proceeds?: number;
  paymentAccountId?: number;
  disposedAt: string;
}

export type DisposeFixedAssetArgs = {
  id: number | string;
  values: DisposeFixedAssetValues;
};

// ---------------------------------------------------------------------------
// Invalidation helpers
// ---------------------------------------------------------------------------

const invalidateAll = (client: QueryClient) => {
  client.invalidateQueries(t.FIXED_ASSETS);
  client.invalidateQueries(t.FIXED_ASSET);
  client.invalidateQueries(t.FIXED_ASSETS_SUMMARY);
};

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Список основных средств. */
export function useFixedAssets(query?: any, props?: any) {
  return useRequestQuery(
    [t.FIXED_ASSETS, query],
    { method: 'get', url: 'fixed-assets', params: query },
    { select: (res: any) => res.data?.data ?? res.data, defaultData: [], ...props },
  );
}

/** Сводка по основным средствам. */
export function useFixedAssetsSummary(props?: any) {
  return useRequestQuery(
    [t.FIXED_ASSETS_SUMMARY],
    { method: 'get', url: 'fixed-assets/summary' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        count: 0,
        grossValue: 0,
        accumulatedDepreciation: 0,
        netBookValue: 0,
      } as FixedAssetsSummary,
      ...props,
    },
  );
}

/** Детальная карточка основного средства с графиком амортизации. */
export function useFixedAsset(id: number | string | undefined, props?: any) {
  return useRequestQuery(
    [t.FIXED_ASSET, id],
    { method: 'get', url: `fixed-assets/${id}` },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: null,
      enabled: !!id,
      ...props,
    },
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Создать новое основное средство. */
export function useCreateFixedAsset(
  props?: UseMutationOptions<any, any, CreateFixedAssetValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, CreateFixedAssetValues>(
    (values) => api.post('fixed-assets', values),
    { onSuccess: () => invalidateAll(client), ...props },
  );
}

/** Начислить амортизацию за месяц по всем активным ОС. */
export function useAccrueMonth(
  props?: UseMutationOptions<any, any, AccrueMonthValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, AccrueMonthValues>(
    (values) => api.post('fixed-assets/accrue', values),
    { onSuccess: () => invalidateAll(client), ...props },
  );
}

/** Списать (выбыть) основное средство. */
export function useDisposeFixedAsset(
  props?: UseMutationOptions<any, any, DisposeFixedAssetArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, DisposeFixedAssetArgs>(
    ({ id, values }) => api.post(`fixed-assets/${id}/dispose`, values),
    { onSuccess: () => invalidateAll(client), ...props },
  );
}

/** Удалить основное средство. */
export function useDeleteFixedAsset(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.delete(`fixed-assets/${id}`),
    { onSuccess: () => invalidateAll(client), ...props },
  );
}
