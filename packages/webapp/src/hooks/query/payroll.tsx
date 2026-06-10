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
  client.invalidateQueries(t.PAYROLL_SETTINGS);
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

// ---- KPI ----
export interface KpiTargetValues {
  employeeId: number;
  periodMonth: string;
  metric: 'revenue' | 'profit';
  targetAmount: number;
  bonusRate: number;
  onlyIfAchieved?: boolean;
  note?: string;
}

const invalidateKpi = (client: QueryClient) => {
  client.invalidateQueries(t.PAYROLL_KPI_TARGETS);
  client.invalidateQueries(t.PAYROLL_KPI_SUMMARY);
  // KPI bonus prefills future pay runs.
  client.invalidateQueries(t.PAYROLL_RUNS);
};

export function useKpiTargets(query?: { year?: number }, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_KPI_TARGETS, query],
    { method: 'get', url: 'payroll/kpi/targets', params: query },
    {
      select: (res: any) => {
        const payload = res.data?.data ?? res.data;
        return payload?.targets ?? payload ?? [];
      },
      defaultData: [],
      ...props,
    },
  );
}

export function useKpiSummary(month: string, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_KPI_SUMMARY, month],
    { method: 'get', url: 'payroll/kpi/summary', params: { month } },
    {
      select: (res: any) => {
        const payload = res.data?.data ?? res.data;
        return payload?.rows ?? payload ?? [];
      },
      defaultData: [],
      enabled: !!month,
      ...props,
    },
  );
}

export function useCreateKpiTarget(
  props?: UseMutationOptions<any, any, KpiTargetValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, KpiTargetValues>(
    (values) => api.post('payroll/kpi/targets', values),
    { onSuccess: () => invalidateKpi(client), ...props },
  );
}

export function useEditKpiTarget(
  props?: UseMutationOptions<any, any, { id: number; values: KpiTargetValues }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { id: number; values: KpiTargetValues }>(
    ({ id, values }) => api.put(`payroll/kpi/targets/${id}`, values),
    { onSuccess: () => invalidateKpi(client), ...props },
  );
}

export function useDeleteKpiTarget(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.delete(`payroll/kpi/targets/${id}`),
    { onSuccess: () => invalidateKpi(client), ...props },
  );
}
