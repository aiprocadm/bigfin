// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';

const STATUS_KEY = 'bank_api_status';

export interface ImportTinkoffValues {
  accountId: number;
  accountNumber: string;
  from: string;
  to: string;
}

const invalidateStatus = (c: QueryClient) => c.invalidateQueries(STATUS_KEY);

/** Статус подключения банковских API. */
export function useBankApiStatus(props?: any) {
  return useRequestQuery(
    [STATUS_KEY],
    { method: 'get', url: 'bank-api-sync/status' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { tinkoffConnected: false },
      ...props,
    },
  );
}

/** Подключить Тинькофф по токену. */
export function useConnectTinkoff(
  props?: UseMutationOptions<any, any, { token: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { token: string }>(
    (values) => api.post('bank-api-sync/tinkoff/connect', values),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Отключить Тинькофф. */
export function useDisconnectTinkoff(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post('bank-api-sync/tinkoff/disconnect'),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Импортировать выписку Тинькофф за период. */
export function useImportTinkoff(
  props?: UseMutationOptions<any, any, ImportTinkoffValues>,
) {
  const api: any = useApiRequest();
  return useMutation<any, any, ImportTinkoffValues>(
    (values) => api.post('bank-api-sync/tinkoff/import', values),
    { ...props },
  );
}
