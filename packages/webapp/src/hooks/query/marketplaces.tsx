// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';

const STATUS_KEY = 'marketplaces_status';

export interface MarketplaceSummary {
  revenue: number;
  toPay: number;
  deductions: number;
  logistics: number;
  penalties: number;
  storage: number;
}

const invalidateStatus = (c: QueryClient) => c.invalidateQueries(STATUS_KEY);

/** Статус подключения маркетплейсов. */
export function useMarketplacesStatus(props?: any) {
  return useRequestQuery(
    [STATUS_KEY],
    { method: 'get', url: 'marketplaces/status' },
    {
      select: (res: any) => {
        // Ответы сервера сериализуются в snake_case.
        const d = res.data?.data ?? res.data ?? {};
        return {
          wildberriesConnected: Boolean(
            d.wildberries_connected ?? d.wildberriesConnected,
          ),
          ozonConnected: Boolean(d.ozon_connected ?? d.ozonConnected),
        };
      },
      defaultData: { wildberriesConnected: false, ozonConnected: false },
      ...props,
    },
  );
}

/** Финансовая сводка Wildberries за период. */
export function useWildberriesSummary(
  fromDate: string,
  toDate: string,
  props?: any,
) {
  return useRequestQuery(
    ['wb_summary', fromDate, toDate],
    {
      method: 'get',
      url: 'marketplaces/wildberries/summary',
      params: { fromDate, toDate },
    },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: null,
      ...props,
    },
  );
}

/** Подключить Wildberries по API-ключу. */
export function useConnectWildberries(
  props?: UseMutationOptions<any, any, { apiKey: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { apiKey: string }>(
    (values) => api.post('marketplaces/wildberries/connect', values),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Отключить Wildberries. */
export function useDisconnectWildberries(
  props?: UseMutationOptions<any, any, void>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post('marketplaces/wildberries/disconnect'),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Финансовая сводка Ozon за период. */
export function useOzonSummary(fromDate: string, toDate: string, props?: any) {
  return useRequestQuery(
    ['ozon_summary', fromDate, toDate],
    {
      method: 'get',
      url: 'marketplaces/ozon/summary',
      params: { fromDate, toDate },
    },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: null,
      ...props,
    },
  );
}

/** Подключить Ozon по Client-Id и Api-Key. */
export function useConnectOzon(
  props?: UseMutationOptions<any, any, { clientId: string; apiKey: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { clientId: string; apiKey: string }>(
    (values) => api.post('marketplaces/ozon/connect', values),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Отключить Ozon. */
export function useDisconnectOzon(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post('marketplaces/ozon/disconnect', {}),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}
