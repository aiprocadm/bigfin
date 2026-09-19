// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import { fromApi } from '@/utils/fromApi';

const STATUS_KEY = 'moysklad_status';

export interface MoyskladProduct {
  externalId: string;
  name: string;
  code: string;
  sellPrice: number;
  costPrice: number;
}
export interface MoyskladSale {
  externalId: string;
  name: string;
  amount: number;
  date: string | null;
}
export interface MoyskladPreview {
  products: MoyskladProduct[];
  sales: MoyskladSale[];
}

export interface MoyskladImportPreview {
  toCreate: number;
  toUpdate: number;
  skipped: number;
  sample: MoyskladProduct[];
}
export interface MoyskladImportResult {
  created: number;
  updated: number;
  skipped: number;
}

const invalidateStatus = (c: QueryClient) => c.invalidateQueries(STATUS_KEY);

/** Ответы API приходят в snake_case — приводим к виду, привычному фронту. */
const toProduct = (p: any): MoyskladProduct => ({
  externalId: p.external_id ?? p.externalId,
  name: p.name,
  code: p.code,
  sellPrice: p.sell_price ?? p.sellPrice ?? 0,
  costPrice: p.cost_price ?? p.costPrice ?? 0,
});

const toSale = (s: any): MoyskladSale => ({
  externalId: s.external_id ?? s.externalId,
  name: s.name,
  amount: s.amount ?? 0,
  date: s.date ?? null,
});

const toImportPreview = (raw: any): MoyskladImportPreview => ({
  toCreate: raw?.to_create ?? raw?.toCreate ?? 0,
  toUpdate: raw?.to_update ?? raw?.toUpdate ?? 0,
  skipped: raw?.skipped ?? 0,
  sample: (raw?.sample ?? []).map(toProduct),
});

/** Статус подключения МойСклад. */
export function useMoyskladStatus(props?: any) {
  return useRequestQuery(
    [STATUS_KEY],
    { method: 'get', url: 'moysklad/status' },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: { connected: false },
      ...props,
    },
  );
}

/** Превью товаров и продаж МойСклад. */
export function useMoyskladPreview(props?: any) {
  return useRequestQuery(
    ['moysklad_preview'],
    { method: 'get', url: 'moysklad/preview' },
    {
      select: (res: any) => {
        const raw = fromApi(res.data?.data ?? res.data);
        return {
          products: (raw?.products ?? []).map(toProduct),
          sales: (raw?.sales ?? []).map(toSale),
        };
      },
      defaultData: { products: [], sales: [] },
      ...props,
    },
  );
}

/** Подключить МойСклад по токену. */
export function useConnectMoysklad(
  props?: UseMutationOptions<any, any, { token: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { token: string }>(
    (values) => api.post('moysklad/connect', values),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Отключить МойСклад. */
export function useDisconnectMoysklad(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post('moysklad/disconnect'),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Предпросмотр импорта товаров: сколько создастся и обновится. */
export function useMoyskladImportPreview(props?: any) {
  return useRequestQuery(
    ['moysklad_import_preview'],
    { method: 'get', url: 'moysklad/import/preview' },
    {
      select: (res: any) => toImportPreview(fromApi(res.data?.data ?? res.data)),
      defaultData: { toCreate: 0, toUpdate: 0, skipped: 0, sample: [] },
      ...props,
    },
  );
}

/** Запустить импорт товаров МойСклад в карточки Bigfin. */
export function useMoyskladImport(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(() => api.post('moysklad/import'), {
    onSuccess: () => {
      client.invalidateQueries('moysklad_import_preview');
      client.invalidateQueries('ITEMS');
    },
    ...props,
  });
}
