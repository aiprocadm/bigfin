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

export interface EmployeeValues {
  fullName: string;
  position?: string;
  employmentType: 'staff' | 'gph' | 'npd' | 'ip';
  defaultSalary?: number;
  active?: boolean;
  note?: string;
}

export interface PayrollRunLineValues {
  employeeId: number;
  baseAmount: number;
  bonusAmount?: number;
  deductionAmount?: number;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.PAYROLL_EMPLOYEES);
  client.invalidateQueries(t.PAYROLL_RUNS);
  client.invalidateQueries(t.PAYROLL_RUN);
  client.invalidateQueries(t.PAYROLL_TAXES_SUMMARY);
  client.invalidateQueries(t.PLANNED_OPERATIONS);
  client.invalidateQueries(t.PAYMENT_CALENDAR_FORECAST);
};

// ---- Settings ----
export function usePayrollSettings(props?: any) {
  return useRequestQuery(
    [t.PAYROLL_SETTINGS],
    { method: 'get', url: 'payroll/settings' },
    { select: (res: any) => res.data, defaultData: {}, ...props },
  );
}

// ---- Employees ----
export function useEmployees(query?: any, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_EMPLOYEES, query],
    { method: 'get', url: 'payroll/employees', params: query },
    { select: (res: any) => res.data.data ?? res.data, defaultData: [], ...props },
  );
}

export function useCreateEmployee(
  props?: UseMutationOptions<any, any, EmployeeValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, EmployeeValues>(
    (values) => api.post('payroll/employees', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditEmployee(
  props?: UseMutationOptions<any, any, { id: number; values: EmployeeValues }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { id: number; values: EmployeeValues }>(
    ({ id, values }) => api.put(`payroll/employees/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteEmployee(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.delete(`payroll/employees/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}

// ---- Runs ----
export function usePayrollRuns(query?: any, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_RUNS, query],
    { method: 'get', url: 'payroll/runs', params: query },
    { select: (res: any) => res.data.data ?? res.data, defaultData: [], ...props },
  );
}

export function usePayrollRun(id: number | null, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_RUN, id],
    { method: 'get', url: `payroll/runs/${id}` },
    { select: (res: any) => res.data, defaultData: null, enabled: !!id, ...props },
  );
}

export function useCreatePayrollRun(
  props?: UseMutationOptions<
    any,
    any,
    { periodMonth: string; payDate: string; note?: string }
  >,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<
    any,
    any,
    { periodMonth: string; payDate: string; note?: string }
  >((values) => api.post('payroll/runs', values), {
    onSuccess: () => invalidate(client),
    ...props,
  });
}

export function useEditPayrollRun(
  props?: UseMutationOptions<
    any,
    any,
    { id: number; values: { payDate?: string; note?: string; lines?: PayrollRunLineValues[] } }
  >,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { id: number; values: any }>(
    ({ id, values }) => api.put(`payroll/runs/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeletePayrollRun(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.delete(`payroll/runs/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useApprovePayrollRun(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.post(`payroll/runs/${id}/approve`, {}),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useUnapprovePayrollRun(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.post(`payroll/runs/${id}/unapprove`, {}),
    { onSuccess: () => invalidate(client), ...props },
  );
}

// ---- Taxes summary ----
export function usePayrollTaxesSummary(year: number, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_TAXES_SUMMARY, year],
    { method: 'get', url: 'payroll/taxes-summary', params: { year } },
    { select: (res: any) => res.data.data ?? res.data, defaultData: [], ...props },
  );
}
