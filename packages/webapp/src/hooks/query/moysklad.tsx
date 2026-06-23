// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';

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

const invalidateStatus = (c: QueryClient) => c.invalidateQueries(STATUS_KEY);

/** Статус подключения МойСклад. */
export function useMoyskladStatus(props?: any) {
  return useRequestQuery(
    [STATUS_KEY],
    { method: 'get', url: 'moysklad/status' },
    {
      select: (res: any) => res.data?.data ?? res.data,
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
      select: (res: any) => res.data?.data ?? res.data,
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
