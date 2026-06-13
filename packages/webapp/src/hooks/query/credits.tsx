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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreditsSummary {
  totalOutstanding: number;
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
}

export interface CreditInstallment {
  id: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAt: string | null;
  note: string | null;
}

export interface CreditRow {
  id: number;
  name: string;
  lender: string | null;
  principalAmount: number;
  annualInterestRate: number;
  termMonths: number;
  startDate: string;
  scheduleType: string;
  paymentAccountId: number;
  note: string | null;
  installments?: CreditInstallment[];
}

export interface CreateCreditValues {
  name: string;
  lender?: string;
  principalAmount: number;
  annualInterestRate: number;
  termMonths: number;
  startDate: string;
  scheduleType: string;
  paymentAccountId: number;
  note?: string;
}

export interface EditCreditValues {
  name?: string;
  lender?: string;
  note?: string;
}

export type EditCreditArgs = [number | string, EditCreditValues];
export type MarkInstallmentPaidArgs = [number | string, number | string];

// ---------------------------------------------------------------------------
// Invalidation helpers
// ---------------------------------------------------------------------------

const invalidateAll = (client: QueryClient) => {
  client.invalidateQueries(t.CREDITS);
  client.invalidateQueries(t.CREDIT);
  client.invalidateQueries(t.CREDITS_SUMMARY);
};

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Список кредитов/займов. */
export function useCredits(query?: any, props?: any) {
  return useRequestQuery(
    [t.CREDITS, query],
    { method: 'get', url: 'credits', params: query },
    { select: (res: any) => res.data?.data ?? res.data, defaultData: [], ...props },
  );
}

/** Детальная карточка кредита с графиком платежей. */
export function useCredit(id: number | string | undefined, props?: any) {
  return useRequestQuery(
    [t.CREDIT, id],
    { method: 'get', url: `credits/${id}` },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: null,
      enabled: !!id,
      ...props,
    },
  );
}

/** Сводка: остаток долга, ближайший платёж (дата и сумма). */
export function useCreditsSummary(props?: any) {
  return useRequestQuery(
    [t.CREDITS_SUMMARY],
    { method: 'get', url: 'credits/summary' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        totalOutstanding: 0,
        nextPaymentDate: null,
        nextPaymentAmount: null,
      } as CreditsSummary,
      ...props,
    },
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Создать новый кредит. */
export function useCreateCredit(
  props?: UseMutationOptions<any, any, CreateCreditValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, CreateCreditValues>(
    (values) => api.post('credits', values),
    { onSuccess: () => invalidateAll(client), ...props },
  );
}

/** Редактировать название/кредитора/заметку кредита. */
export function useEditCredit(
  props?: UseMutationOptions<any, any, EditCreditArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, EditCreditArgs>(
    ([id, values]) => api.put(`credits/${id}`, values),
    { onSuccess: () => invalidateAll(client), ...props },
  );
}

/** Удалить кредит. */
export function useDeleteCredit(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.delete(`credits/${id}`),
    { onSuccess: () => invalidateAll(client), ...props },
  );
}

/** Отметить платёж по графику как оплаченный. */
export function useMarkCreditInstallmentPaid(
  props?: UseMutationOptions<any, any, MarkInstallmentPaidArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, MarkInstallmentPaidArgs>(
    ([creditId, installmentId]) =>
      api.post(`credits/${creditId}/installments/${installmentId}/pay`, {}),
    { onSuccess: () => invalidateAll(client), ...props },
  );
}
