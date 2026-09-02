import { useRequestQuery } from '../../useQueryRequest';
import { useDownloadFile } from '../../useDownloadFile';
import { useRequestPdf } from '../../useRequestPdf';
import t from '../types';

/**
 * Retrieve vendors transactions report.
 */
export function useVendorsTransactionsReport(query: any, props: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, t.VENDORS_TRANSACTIONS, query],
    {
      method: 'get',
      url: '/reports/transactions-by-vendors',
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

export const useVendorsTransactionsXlsxExport = (query: any, args: any) => {
  const url = '/reports/transactions-by-vendors';
  const config = {
    headers: {
      accept: 'application/xlsx',
    },
    params: query,
  };
  const filename = 'transactions_by_vendor.xlsx';

  return useDownloadFile({
    url,
    config,
    filename,
    ...args,
  });
};

export const useVendorsTransactionsCsvExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/transactions-by-vendors',
    config: {
      headers: {
        accept: 'application/csv',
      },
      params: query,
    },
    filename: 'transactions_by_vendor.csv',
    ...args,
  });
};
/**
 * Retrieves pdf document data of the transactions by vendor sheet.
 */
export function useTransactionsByVendorsPdf(query = {}) {
  return useRequestPdf({
    // Хук бил в несуществующий `financial_statements/…`, а сервер отвечает
    // на `/reports/…` (как у соседнего отчёта по клиентам) — PDF отчёта
    // «Транзакции по поставщикам» не работал вообще (Р3 карты v16).
    url: '/reports/transactions-by-vendors',
    params: query,
  });
}
