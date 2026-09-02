import { useRequestQuery } from '../../useQueryRequest';
import { useDownloadFile } from '../../useDownloadFile';
import { useRequestPdf } from '../../useRequestPdf';
import t from '../types';

/**
 * Retrieves the sales tax liability summary report.
 */
export function useSalesTaxLiabilitySummary(query: any, props: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, t.SALES_TAX_LIABILITY_SUMMARY, query],
    {
      method: 'get',
      url: '/reports/sales-tax-liability-summary',
      params: query,
      headers: {
        Accept: 'application/json+table',
      },
    },
    {
      select: (res: any) => res.data,
      ...props,
    },
  );
}

export const useSalesTaxLiabilitySummaryXlsxExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/sales-tax-liability-summary',
    config: {
      headers: {
        accept: 'application/xlsx',
      },
      params: query,
    },
    filename: 'sales_tax_liability_summary.xlsx',
    ...args,
  });
};

export const useSalesTaxLiabilitySummaryCsvExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/sales-tax-liability-summary',
    config: {
      headers: {
        accept: 'application/csv',
      },
      params: query,
    },
    filename: 'sales_tax_liability_summary.csv',
    ...args,
  });
};

/**
 * Retrieves pdf document data of sales tax liability summary.
 */
export function useSalesTaxLiabilitySummaryPdf(query = {}) {
  return useRequestPdf({
    url: `/reports/sales-tax-liability-summary`,
    params: query,
  });
}
