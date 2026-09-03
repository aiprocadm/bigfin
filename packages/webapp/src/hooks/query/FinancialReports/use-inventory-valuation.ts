import { useRequestQuery } from '../../useQueryRequest';
import { useDownloadFile } from '../../useDownloadFile';
import { useRequestPdf } from '../../useRequestPdf';
import t from '../types';

/**
 * Retrieve inventory valuation.
 */
export function useInventoryValuation(query: any, props: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, t.INVENTORY_VALUATION, query],
    {
      method: 'get',
      url: '/reports/inventory-valuation',
      params: query,
    },
    {
      select: (res: any) => res.data,

      ...props,
    },
  );
}

/**
 * Retrieve inventory valuation.
 */
export function useInventoryValuationTable(query: any, props: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, t.INVENTORY_VALUATION, query],
    {
      method: 'get',
      url: '/reports/inventory-valuation',
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

export const useInventoryValuationXlsxExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/inventory-valuation',
    config: {
      headers: {
        accept: 'application/xlsx',
      },
      params: query,
    },
    filename: 'inventory_valuation.xlsx',
    ...args,
  });
};

export const useInventoryValuationCsvExport = (query: any, args: any) => {
  return useDownloadFile({
    url: '/reports/inventory-valuation',
    config: {
      headers: {
        accept: 'application/csv',
      },
      params: query,
    },
    filename: 'inventory_valuation.csv',
    ...args,
  });
};

/**
 * Retrieves the inventory valuation pdf document data.
 */
export function useInventoryValuationPdf(query = {}) {
  return useRequestPdf({
    url: `/reports/inventory-valuation`,
    params: query,
  });
}
