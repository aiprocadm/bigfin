// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';

const STATUS_KEY = 'zenmoney_status';
const invalidateStatus = (c: QueryClient) => c.invalidateQueries(STATUS_KEY);

/** Статус подключения Дзенмани. */
export function useZenmoneyStatus(props?: any) {
  return useRequestQuery(
    [STATUS_KEY],
    { method: 'get', url: 'zenmoney/status' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { connected: false },
      ...props,
    },
  );
}

/** Подключить Дзенмани по токену. */
export function useConnectZenmoney(
  props?: UseMutationOptions<any, any, { token: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { token: string }>(
    (values) => api.post('zenmoney/connect', values),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Отключить Дзенмани. */
export function useDisconnectZenmoney(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(() => api.post('zenmoney/disconnect'), {
    onSuccess: () => invalidateStatus(client),
    ...props,
  });
}

/** Импортировать операции Дзенмани в денежный счёт. */
export function useImportZenmoney(
  props?: UseMutationOptions<any, any, { accountId: number }>,
) {
  const api: any = useApiRequest();
  return useMutation<any, any, { accountId: number }>(
    (values) => api.post('zenmoney/import', values),
    { ...props },
  );
}
