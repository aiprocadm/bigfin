// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';

const CRM_STATUS_KEY = 'crm_status';

export interface CrmStatus {
  activeConnector: string | null;
  bitrix24Connected: boolean;
}

export interface CrmSyncResult {
  contactsImported: number;
  contactsSkipped: number;
  dealsImported: number;
  dealsSkipped: number;
}

const invalidateStatus = (client: QueryClient) =>
  client.invalidateQueries(CRM_STATUS_KEY);

/** Статус подключения CRM (активный коннектор, подключён ли Битрикс24). */
export function useCrmStatus(props?: any) {
  return useRequestQuery(
    [CRM_STATUS_KEY],
    { method: 'get', url: 'crm/status' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { activeConnector: null, bitrix24Connected: false },
      ...props,
    },
  );
}

/** Подключить Битрикс24 по webhook-URL. */
export function useConnectBitrix24(
  props?: UseMutationOptions<any, any, { webhookUrl: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { webhookUrl: string }>(
    (values) => api.post('crm/bitrix24/connect', values),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Отключить Битрикс24. */
export function useDisconnectBitrix24(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post('crm/bitrix24/disconnect'),
    { onSuccess: () => invalidateStatus(client), ...props },
  );
}

/** Запустить синхронизацию CRM → Bigfin. */
export function useRunCrmSync(props?: UseMutationOptions<any, any, void>) {
  const api: any = useApiRequest();
  return useMutation<any, any, void>(() => api.post('crm/sync'), { ...props });
}
