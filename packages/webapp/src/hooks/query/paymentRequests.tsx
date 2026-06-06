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

export interface PaymentRequestValues {
  amount: number;
  currencyCode?: string;
  articleId?: number | null;
  contactId?: number | null;
  accountId?: number | null;
  branchId?: number | null;
  dueDate: string;
  description?: string;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.PAYMENT_REQUESTS);
  client.invalidateQueries(t.PAYMENT_REQUEST);
};

/** List payment requests (optional status filter). */
export function usePaymentRequests(query?: any, props?: any) {
  return useRequestQuery(
    [t.PAYMENT_REQUESTS, query],
    { method: 'get', url: 'payment-requests', params: query },
    { select: (res: any) => res.data.data, defaultData: [], ...props },
  );
}

/** A single payment request. */
export function usePaymentRequest(id: number | string, props?: any) {
  return useRequestQuery(
    [t.PAYMENT_REQUEST, id],
    { method: 'get', url: `payment-requests/${id}` },
    { select: (res: any) => res.data, defaultData: {}, enabled: !!id, ...props },
  );
}

export function useCreatePaymentRequest(
  props?: UseMutationOptions<any, any, PaymentRequestValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, PaymentRequestValues>(
    (values) => api.post('payment-requests', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useApprovePaymentRequest(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.post(`payment-requests/${id}/approve`, {}),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useRejectPaymentRequest(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.post(`payment-requests/${id}/reject`, {}),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useCancelPaymentRequest(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.post(`payment-requests/${id}/cancel`, {}),
    { onSuccess: () => invalidate(client), ...props },
  );
}
