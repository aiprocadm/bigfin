import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from 'react-query';

import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';

const GROUPS_KEY = 'ACCOUNT_GROUPS';

/**
 * Группы денежных счетов (FIN-017 ТЗ-2).
 *
 * Правки сбрасывают ещё и виджет денег: он показывает те же группы, и
 * оставить его со старым списком значит показать человеку кучку, которую он
 * только что удалил.
 */
const invalidate = (client: any) => {
  client.invalidateQueries([GROUPS_KEY]);
  client.invalidateQueries(['DASHBOARD_MONEY_WIDGET']);
};

export function useAccountGroups(): UseQueryResult<any, Error> {
  const apiRequest = useApiRequest();

  return useQuery<any, Error>([GROUPS_KEY], () =>
    apiRequest
      .get('banking/account-groups', {})
      .then((res: any) => transformToCamelCase(res.data)),
  );
}

export function useCreateAccountGroup(props?: any) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation(
    (values: { name: string; sortOrder?: number }) =>
      apiRequest.post('banking/account-groups', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditAccountGroup(props?: any) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation(
    (values: { id: number; name: string; sortOrder?: number }) =>
      apiRequest.put(`banking/account-groups/${values.id}`, {
        name: values.name,
        sortOrder: values.sortOrder,
      }),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteAccountGroup(props?: any) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation(
    (id: number) => apiRequest.delete(`banking/account-groups/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}

/** Перенос счёта в группу; `null` — в «Нераспределённые». */
export function useAssignAccountGroup(props?: any) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation(
    (values: { accountId: number; groupId: number | null }) =>
      apiRequest.put(`banking/account-groups/assign/${values.accountId}`, {
        groupId: values.groupId,
      }),
    { onSuccess: () => invalidate(client), ...props },
  );
}
