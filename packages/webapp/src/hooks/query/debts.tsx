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

export interface InstallmentInput {
  dueDate: string;
  amount: number;
  status?: string;
  note?: string;
}

export interface RepaymentPlanValues {
  side: 'receivable' | 'payable';
  contactId: number;
  sourceType?: string;
  sourceId?: number;
  currencyCode?: string;
  description?: string;
  installments: InstallmentInput[];
}

export type EditRepaymentPlanArgs = [number | string, RepaymentPlanValues];
export type MarkPaidArgs = [number | string, number | string];

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.DEBTS_OVERVIEW);
  client.invalidateQueries(t.DEBTS_CONTACT);
  client.invalidateQueries(t.DEBTS_PLANS);
};

/** Debts overview: AR/AP totals, aging buckets, top debtors. */
export function useDebtsOverview(query?: any, props?: any) {
  return useRequestQuery(
    [t.DEBTS_OVERVIEW, query],
    { method: 'get', url: 'debts/overview', params: query },
    { select: (res: any) => res.data, defaultData: {}, ...props },
  );
}

/** Unpaid documents of a contact (drill-down). */
export function useContactDebts(contactId: number, query?: any, props?: any) {
  return useRequestQuery(
    [t.DEBTS_CONTACT, contactId, query],
    { method: 'get', url: `debts/contact/${contactId}`, params: query },
    {
      select: (res: any) => res.data,
      defaultData: [],
      enabled: !!contactId,
      ...props,
    },
  );
}

/** Repayment plans with progress. */
export function useRepaymentPlans(query?: any, props?: any) {
  return useRequestQuery(
    [t.DEBTS_PLANS, query],
    { method: 'get', url: 'debts/repayment-plans', params: query },
    { select: (res: any) => res.data, defaultData: [], ...props },
  );
}

/** Send a payment reminder to the debtor (reuses invoice email). */
export function useRemindDebtor(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (invoiceId) => api.post(`debts/invoices/${invoiceId}/remind`, {}),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useCreateRepaymentPlan(
  props?: UseMutationOptions<any, any, RepaymentPlanValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, RepaymentPlanValues>(
    (values) => api.post('debts/repayment-plans', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditRepaymentPlan(
  props?: UseMutationOptions<any, any, EditRepaymentPlanArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, EditRepaymentPlanArgs>(
    ([id, values]) => api.put(`debts/repayment-plans/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteRepaymentPlan(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.delete(`debts/repayment-plans/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useMarkInstallmentPaid(
  props?: UseMutationOptions<any, any, MarkPaidArgs>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, MarkPaidArgs>(
    ([planId, installmentId]) =>
      api.post(
        `debts/repayment-plans/${planId}/installments/${installmentId}/pay`,
        {},
      ),
    { onSuccess: () => invalidate(client), ...props },
  );
}
