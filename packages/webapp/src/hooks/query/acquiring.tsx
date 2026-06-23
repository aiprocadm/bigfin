// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';

const STATUS_KEY = 'acquiring_status';
const invalidateStatus = (c: QueryClient) => c.invalidateQueries(STATUS_KEY);

export interface AcquiringSummary {
  gross: number;
  net: number;
  commission: number;
  count: number;
}

/** Статус подключения эквайринга. */
export function useAcquiringStatus(props?: any) {
  return useRequestQuery(
    [STATUS_KEY],
    { method: 'get', url: 'acquiring/status' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { yookassaConnected: false },
      ...props,
    },
  );
}

/** Сводка эквайринга YooKassa за период. */
export function useYookassaSummary(from: string, to: string, props?: any) {
  return useRequestQuery(
    ['yookassa_summary', from, to],
    {
      method: 'get',
      url: 'acquiring/yookassa/summary',
      params: { from, to },
    },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: null,
      ...props,
    },
  );
}

/** Подключить YooKassa. */
export function useConnectYookassa(
  props?: UseMutationOptions<any, any, { shopId: string; secretKey: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { shopId: string; secretKey: string }>(
    (values) => api.post('acquiring/yookassa/connect', values),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Отключить YooKassa. */
export function useDisconnectYookassa(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post('acquiring/yookassa/disconnect'),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}
