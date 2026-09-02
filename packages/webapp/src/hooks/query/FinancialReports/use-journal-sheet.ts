import { useRequestQuery } from '../../useQueryRequest';
import { useDownloadFile } from '../../useDownloadFile';
import { useRequestPdf } from '../../useRequestPdf';
import t from '../types';

/**
 * Retrieve journal sheet.
 */
export function useJournalSheet(query: any, props: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, t.JOURNAL, query],
    {
      method: 'get',
      url: '/reports/journal',
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

export const useJournalSheetXlsxExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/journal',
    config: {
      headers: {
        accept: 'application/xlsx',
      },
      params: query,
    },
    filename: 'journal.xlsx',
    ...args,
  });
};

export const useJournalSheetCsvExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/journal',
    config: {
      headers: {
        accept: 'application/csv',
      },
      params: query,
    },
    filename: 'journal.csv',
    ...args,
  });
};

/**
 * Retrieves the journal sheet pdf content.
 */
export const useJournalSheetPdf = (query = {}) => {
  return useRequestPdf({
    url: `/reports/journal`,
    params: query,
  });
};
