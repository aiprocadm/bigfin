// © 2026 Bigfin
import { useRequestQuery } from '../useQueryRequest';
import t from './types';

export interface MarginPoint {
  month: string;
  revenue: number;
  profit: number;
  margin: number;
}

export interface FinancialOverview {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  employeeCount: number;
  revenuePerEmployee: number;
  revenuePerEmployeeApplicable: boolean;
  marginOverTime: MarginPoint[];
}

/** Обзор финмодели за период (fromDate/toDate в query). */
export function useFinancialOverview(query?: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_OVERVIEW, query],
    { method: 'get', url: 'financial-model/overview', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        revenue: 0,
        costs: 0,
        profit: 0,
        margin: 0,
        employeeCount: 0,
        revenuePerEmployee: 0,
        revenuePerEmployeeApplicable: false,
        marginOverTime: [],
      } as FinancialOverview,
      ...props,
    },
  );
}

export interface SegmentRow {
  id: number;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

export interface ProductMarginItem {
  itemId: number;
  name: string;
  revenue: number;
  cost: number;
  grossMargin: number;
  margin: number;
}

export interface SegmentProfitability {
  byDeal: SegmentRow[];
  byManager: SegmentRow[];
  byBranch: SegmentRow[];
  byProduct: ProductMarginItem[];
}

/** Рентабельность по сегментам за период (fromDate/toDate в query). */
export function useFinancialSegments(query?: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_SEGMENTS, query],
    { method: 'get', url: 'financial-model/segments', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        byDeal: [],
        byManager: [],
        byBranch: [],
        byProduct: [],
      } as SegmentProfitability,
      ...props,
    },
  );
}
