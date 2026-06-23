// © 2026 Bigfin
import { useRequestQuery } from '../useQueryRequest';

export interface VatByAccount {
  accountId: number;
  accountName: string;
  charged: number;
  deductible: number;
}

export interface VatSummary {
  charged: number;
  deductible: number;
  payable: number;
  byAccount: VatByAccount[];
}

/** Сводка по НДС за период (начислен / к вычету / к уплате). */
export function useVatSummary(fromDate: string, toDate: string, props?: any) {
  return useRequestQuery(
    ['vat_analysis', fromDate, toDate],
    {
      method: 'get',
      url: 'vat-analysis',
      params: { fromDate, toDate },
    },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { charged: 0, deductible: 0, payable: 0, byAccount: [] },
      ...props,
    },
  );
}
