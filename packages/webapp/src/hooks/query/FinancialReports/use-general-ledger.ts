import { useRequestQuery } from '../../useQueryRequest';
import { useDownloadFile } from '../../useDownloadFile';
import { useRequestPdf } from '../../useRequestPdf';
import t from '../types';

/**
 * Retrieve general ledger (GL) sheet.
 */
export function useGeneralLedgerSheet(query: any, props: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, t.GENERAL_LEDGER, query],
    {
      method: 'get',
      url: '/reports/general-ledger',
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
export const useGeneralLedgerSheetXlsxExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/general-ledger',
    config: {
      headers: {
        accept: 'application/xlsx',
      },
      params: query,
    },
    filename: 'general_ledger.xlsx',
    ...args,
  });
};

export const useGeneralLedgerSheetCsvExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/general-ledger',
    config: {
      headers: {
        accept: 'application/csv',
      },
      params: query,
    },
    filename: 'general_ledger.csv',
    ...args,
  });
};

/**
 * Retrieves the general ledger pdf document data.
 */
export function useGeneralLedgerPdf(query = {}) {
  return useRequestPdf({
    url: `/reports/general-ledger`,
    params: query,
  });
}
