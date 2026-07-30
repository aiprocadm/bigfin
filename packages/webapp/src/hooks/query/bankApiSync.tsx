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

/** Идентификаторы банков волны 1 (совпадают с серверным реестром). */
export type BankProviderId = 'tinkoff' | 'alfa';

export interface ImportStatementValues {
  accountId: number;
  accountNumber: string;
  from: string;
  to: string;
}

/** Учётные данные: токен (Тинькофф) или OAuth-приложение (Альфа). */
export interface ConnectBankValues {
  token?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

const invalidateStatus = (c: QueryClient) => c.invalidateQueries(STATUS_KEY);

/** Статус подключения банковских API: карта «банк → подключён». */
export function useBankApiStatus(props?: any) {
  return useRequestQuery(
    [STATUS_KEY],
    { method: 'get', url: 'bank-api-sync/status' },
    {
      select: (res: any) => {
        const data = res.data?.data ?? res.data;
        return {
          connected: data?.connected ?? {
            // Ответ сервера до мультипровайдерности.
            tinkoff: !!data?.tinkoff_connected,
            alfa: false,
          },
        };
      },
      defaultData: { connected: { tinkoff: false, alfa: false } },
      ...props,
    },
  );
}

/** Подключить банк по его учётным данным. */
export function useConnectBank(
  provider: BankProviderId,
  props?: UseMutationOptions<any, any, ConnectBankValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, ConnectBankValues>(
    (values) => api.post(`bank-api-sync/${provider}/connect`, values),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Отключить банк. */
export function useDisconnectBank(
  provider: BankProviderId,
  props?: UseMutationOptions<any, any, void>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post(`bank-api-sync/${provider}/disconnect`),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Импортировать выписку банка за период. */
export function useImportBankStatement(
  provider: BankProviderId,
  props?: UseMutationOptions<any, any, ImportStatementValues>,
) {
  const api: any = useApiRequest();
  return useMutation<any, any, ImportStatementValues>(
    (values) => api.post(`bank-api-sync/${provider}/import`, values),
    { ...props },
  );
}
