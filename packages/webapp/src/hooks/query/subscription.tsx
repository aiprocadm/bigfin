import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryOptions,
  UseQueryResult,
} from 'react-query';
import useApiRequest from '../useRequest';
import { transformToCamelCase } from '@/utils';

const QueryKeys = {
  Subscriptions: 'GetSubscriptions',
};

interface CancelMainSubscriptionResponse {}

/**
 * Cancels the main subscription of the current organization.
 *
 * Доводов у запуска нет: серверу ничего не передаётся. Раньше виды стояли в
 * обратном порядке (`<Values, Error, Response>`), и запуск требовал передать
 * «ответ сервера» — тот же класс, что у смены тарифа в карте v82
 * (Д5 карты v87).
 */
export function useCancelMainSubscription(
  options?: UseMutationOptions<CancelMainSubscriptionResponse, Error, void>,
): UseMutationResult<CancelMainSubscriptionResponse, Error, void> {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<CancelMainSubscriptionResponse, Error, void>(
    () => apiRequest.post(`/subscription/cancel`).then((res) => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(QueryKeys.Subscriptions);
      },
      ...options,
    },
  );
}

interface ResumeMainSubscriptionResponse {}

/**
 * Resumes the main subscription of the current organization.
 * Доводов у запуска нет — см. `useCancelMainSubscription` (Д5 карты v87).
 */
export function useResumeMainSubscription(
  options?: UseMutationOptions<ResumeMainSubscriptionResponse, Error, void>,
): UseMutationResult<ResumeMainSubscriptionResponse, Error, void> {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<ResumeMainSubscriptionResponse, Error, void>(
    () => apiRequest.post(`/subscription/resume`).then((res) => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(QueryKeys.Subscriptions);
      },
      ...options,
    },
  );
}

interface ChangeMainSubscriptionPlanValues {
  variant_id: string;
}
interface ChangeMainSubscriptionPlanResponse {}

/**
 * Меняет основную подписку текущей организации.
 *
 * Порядок видов — (что вернётся, ошибка, что передаём). Снаружи он стоял
 * наоборот, хотя внутри `useMutation` записан верно: вызывающему обещали, что
 * менять тариф надо ответом сервера, а передавать он должен `{ variant_id }`
 * (Д14 карты v82).
 */
export function useChangeSubscriptionPlan(
  options?: UseMutationOptions<
    ChangeMainSubscriptionPlanResponse,
    Error,
    ChangeMainSubscriptionPlanValues
  >,
): UseMutationResult<
  ChangeMainSubscriptionPlanResponse,
  Error,
  ChangeMainSubscriptionPlanValues
> {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<
    ChangeMainSubscriptionPlanResponse,
    Error,
    ChangeMainSubscriptionPlanValues
  >(
    (values) =>
      apiRequest.post(`/subscription/change`, values).then((res) => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(QueryKeys.Subscriptions);
      },
      ...options,
    },
  );
}

interface LemonSubscription {
  active: boolean;
  canceled: string | null;
  canceledAt: string | null;
  canceledAtFormatted: string | null;
  cancelsAt: string | null;
  cancelsAtFormatted: string | null;
  createdAt: string;
  ended: boolean;
  endsAt: string | null;
  inactive: boolean;
  lemonSubscriptionId: string;
  lemon_urls: {
    updatePaymentMethod: string;
    customerPortal: string;
    customerPortalUpdateSubscription: string;
  };
  onTrial: boolean;
  planId: number;
  planName: string;
  planSlug: string;
  slug: string;
  startsAt: string | null;
  status: string;
  statusFormatted: string;
  tenantId: number;
  trialEndsAt: string | null;
  trialEndsAtFormatted: string | null;
  trialStartsAt: string | null;
  trialStartsAtFormatted: string | null;
  updatedAt: string;
}

interface GetSubscriptionsQuery {}
interface GetSubscriptionsResponse {
  subscriptions: Array<LemonSubscription>;
}

/**
 * Changese the main subscription of the current organization.
 * @param {UseMutationOptions<ChangeMainSubscriptionPlanValues, Error, ChangeMainSubscriptionPlanResponse>} options -
 * @returns {UseMutationResult<ChangeMainSubscriptionPlanValues, Error, ChangeMainSubscriptionPlanResponse>}
 */
export function useGetSubscriptions(
  options?: UseQueryOptions<
    GetSubscriptionsQuery,
    Error,
    GetSubscriptionsResponse
  >,
): UseQueryResult<GetSubscriptionsResponse, Error> {
  const apiRequest = useApiRequest();

  return useQuery<GetSubscriptionsQuery, Error, GetSubscriptionsResponse>(
    [QueryKeys.Subscriptions],
    (values) =>
      apiRequest
        .get(`/subscription`)
        .then((res) => transformToCamelCase(res.data)),
    {
      ...options,
    },
  );
}
