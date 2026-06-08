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

export interface DealStageValues {
  name: string;
  plannedRevenue?: number;
  plannedCost?: number;
  sortOrder?: number;
  status?: 'open' | 'closed';
  closedDate?: string;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.DEAL_STAGES);
};

/** A deal's stages + recognition summary. */
export function useDealStages(dealId: number | string, query?: any, props?: any) {
  return useRequestQuery(
    [t.DEAL_STAGES, dealId, query],
    { method: 'get', url: `deals/${dealId}/stages`, params: query },
    { select: (res: any) => res.data, enabled: !!dealId, ...props },
  );
}

export function useCreateStage(
  dealId: number | string,
  props?: UseMutationOptions<any, any, DealStageValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, DealStageValues>(
    (values) => api.post(`deals/${dealId}/stages`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditStage(
  dealId: number | string,
  props?: UseMutationOptions<any, any, [number | string, DealStageValues]>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, [number | string, DealStageValues]>(
    ([stageId, values]) => api.put(`deals/${dealId}/stages/${stageId}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteStage(
  dealId: number | string,
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (stageId) => api.delete(`deals/${dealId}/stages/${stageId}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
