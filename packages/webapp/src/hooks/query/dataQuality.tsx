// © 2026 Bigfin
import { useRequestQuery } from '../useQueryRequest';
import t from './types';

export interface DataQualityPeriodQuery {
  fromDate: string;
  toDate: string;
}

/** Accounts of P&L type without a management article, with their operations. */
export function useDataQualityUnmapped(
  query: DataQualityPeriodQuery,
  props?: any,
) {
  return useRequestQuery(
    [t.DATA_QUALITY_UNMAPPED, query],
    { method: 'get', url: 'data-quality/unmapped-operations', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { accounts: [], totalCount: 0 },
      ...props,
    },
  );
}

/** Groups of possibly duplicated entries (same date/account/amount/side). */
export function useDataQualityDuplicates(
  query: DataQualityPeriodQuery,
  props?: any,
) {
  return useRequestQuery(
    [t.DATA_QUALITY_DUPLICATES, query],
    { method: 'get', url: 'data-quality/duplicates', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { groups: [], totalGroups: 0 },
      ...props,
    },
  );
}

/** Monthly P&L vs cash-flow comparison. */
export function useDataQualityPlCashflow(
  query: DataQualityPeriodQuery,
  props?: any,
) {
  return useRequestQuery(
    [t.DATA_QUALITY_PL_CASHFLOW, query],
    { method: 'get', url: 'data-quality/pl-cashflow', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { months: [], totals: { plNet: 0, cashNet: 0, diff: 0 } },
      ...props,
    },
  );
}
