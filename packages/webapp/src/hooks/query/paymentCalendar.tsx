import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';
import { mapForecast } from '@/containers/PaymentCalendar/mapForecast';
import { unwrapData } from '@/utils/unwrapData';

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
  /** Автоподтверждение фактом (FT-052 ТЗ-3). */
  autoConfirm?: boolean;
  matchExactAmount?: boolean;
  matchAnyContact?: boolean;
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
      // Ответ приходит в snake_case — приводим к виду, привычному странице.
      select: (res: any) => mapForecast(res.data),
      defaultData: { days: [], gap: null, openingBalance: 0, baseCurrency: 'RUB' },
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
      select: (res: any) => unwrapData(res),
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

/**
 * Материализует план в реальную денежную операцию (О3 карты v13).
 */
export function useMaterializePlannedOperation(
  props?: UseMutationOptions<any, any, { id: number; date?: string }>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, { id: number; date?: string }>(
    ({ id, date }) =>
      apiRequest.post(
        `payment-calendar/planned-operations/${id}/materialize`,
        date ? { date } : {},
      ),
    {
      onSuccess: () => {
        commonInvalidate(client);
        // Появилась настоящая операция — обновляем деньги и остатки счетов.
        client.invalidateQueries(t.CASH_FLOW_TRANSACTIONS);
        client.invalidateQueries(t.ACCOUNTS);
      },
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

/**
 * С2 карты v49. Показал ли сервер не всё.
 *
 * Ключ запроса тот же, что у списка, — значит ответ берётся из уже
 * полученного, второго обращения к серверу не происходит.
 */
export function usePlannedOperationsTruncated(query?: any, props?: any) {
  return useRequestQuery(
    [t.PLANNED_OPERATIONS, query],
    { method: 'get', url: 'payment-calendar/planned-operations', params: query },
    {
      select: (res: any) => Boolean(res?.data?.truncated),
      defaultData: false,
      ...props,
    },
  );
}

/**
 * Календарь матрицей «план / факт» (FT-050 ТЗ-3): плановый остаток
 * накапливается от факта на начало.
 */
export function useCalendarMatrix(query: Record<string, unknown>, props?: any) {
  return useRequestQuery(
    [t.PAYMENT_CALENDAR_FORECAST, 'matrix', query],
    { method: 'get', url: 'payment-calendar/matrix', params: query },
    { select: (res: any) => res.data, defaultData: null, ...props },
  );
}

/** «Что можно перенести» до разрыва (FT-051 ТЗ-3). */
export function useGapScenarios(query: Record<string, unknown>, props?: any) {
  return useRequestQuery(
    [t.PAYMENT_CALENDAR_FORECAST, 'gap-scenarios', query],
    { method: 'get', url: 'payment-calendar/gap-scenarios', params: query },
    { select: (res: any) => res.data, defaultData: null, ...props },
  );
}

/** Прогноз после переноса — без сохранения (FT-051 ТЗ-3). */
export function useWhatIf() {
  const apiRequest = useApiRequest();
  return useMutation((body: { moves: Array<{ plannedOperationId: number; date: string }>; horizonDays?: number }) =>
    apiRequest.post('payment-calendar/what-if', body).then((res: any) => res.data),
  );
}

/** «Перенести» разовый план на другую дату (FT-051 ТЗ-3). */
export function useReschedulePlannedOperation() {
  const client = useQueryClient();
  const apiRequest = useApiRequest();
  return useMutation(
    ({ id, plannedDate }: { id: number; plannedDate: string }) =>
      apiRequest.post(`payment-calendar/planned-operations/${id}/reschedule`, { plannedDate }).then((res: any) => res.data),
    { onSuccess: () => commonInvalidate(client) },
  );
}

