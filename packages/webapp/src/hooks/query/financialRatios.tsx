// © 2026 Bigfin
import { useRequestQuery } from '../useQueryRequest';

export interface FinancialRatios {
  roe: number | null;
  roa: number | null;
  netMargin: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  workingCapital: number;
  debtToEquity: number | null;
  debtRatio: number | null;
  equityRatio: number | null;
  /** Капитал отрицательный — показатели «на капитал» неприменимы. */
  equityNegative: boolean;
}

export interface VerticalRow {
  key: string;
  label: string;
  amount: number;
  share: number | null;
}

export interface HorizontalRow {
  key: string;
  label: string;
  current: number;
  previous: number;
  change: number;
  changePct: number | null;
}

export interface FinancialRatiosMeta {
  basis: 'accrual';
  asOf: string;
  fromDate: string;
  toDate: string;
  previousFromDate: string;
  previousToDate: string;
}

export interface FinancialRatiosResult {
  ratios: FinancialRatios;
  vertical: VerticalRow[];
  horizontal: HorizontalRow[];
  meta: FinancialRatiosMeta;
}

/** Коэффициенты + вертикальный и горизонтальный анализ ОПиУ за период. */
export function useFinancialRatios(
  fromDate: string,
  toDate: string,
  props?: any,
) {
  return useRequestQuery(
    ['financial_ratios', fromDate, toDate],
    {
      method: 'get',
      url: 'financial-ratios',
      params: { fromDate, toDate },
    },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { ratios: null, vertical: [], horizontal: [], meta: null },
      ...props,
    },
  );
}
