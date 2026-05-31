import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface PlannedOperationValues {
  direction: 'inflow' | 'outflow';
  amount: number;
  currencyCode?: string;
  plannedDate: string;
  articleId?: number | null;
  accountId?: number | null;
  branchId?: number | null;
  contactId?: number | null;
  description?: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  } | null;
}

export type EditPlannedOperationArgs = [number | string, PlannedOperationValues];

const commonInvalidate = (client: QueryClient) => {
  client.invalidateQueries(t.PAYMENT_CALENDAR_FORECAST);
  client.invalidateQueries(t.PLANNED_OPERATIONS);
  client.invalidateQueries(t.PLANNED_OPERATION);
};

/** Payment calendar forecast for a horizon. */
export function usePaymentCalendar(query?: any, props?: any) {
  return useRequestQuery(
    [t.PAYMENT_CALENDAR_FORECAST, query],
    { method: 'get', url: 'payment-calendar', params: query },
    {
      select: (res: any) => res.data,
      defaultData: { days: [], gap: null },
      ...props,
    },
  );
}

/** Planned operations list. */
export function usePlannedOperations(query?: any, props?: any) {
  return useRequestQuery(
    [t.PLANNED_OPERATIONS, query],
    { method: 'get', url: 'payment-calendar/planned-operations', params: query },
    {
      select: (res: any) => res.data.data,
      defaultData: [],
      ...props,
    },
  );
}

/** Create a planned operation. */
export function useCreatePlannedOperation(
  props?: UseMutationOptions<any, any, PlannedOperationValues>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, PlannedOperationValues>(
    (values) => apiRequest.post('payment-calendar/planned-operations', values),
    {
      onSuccess: () => commonInvalidate(client),
      ...props,
    },
  );
}

/** Edit a planned operation. */
export function useEditPlannedOperation(
  props?: UseMutationOptions<any, any, EditPlannedOperationArgs>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, EditPlannedOperationArgs>(
    ([id, values]) =>
      apiRequest.put(`payment-calendar/planned-operations/${id}`, values),
    {
      onSuccess: () => commonInvalidate(client),
      ...props,
    },
  );
}

/** Delete a planned operation. */
export function useDeletePlannedOperation(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, number | string>(
    (id) => apiRequest.delete(`payment-calendar/planned-operations/${id}`),
    {
      onSuccess: () => commonInvalidate(client),
      ...props,
    },
  );
}
