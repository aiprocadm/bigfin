import { useRequestQuery } from '../../useQueryRequest';
import { useDownloadFile } from '../../useDownloadFile';
import t from '../types';

/**
 * Управленческий ОПиУ по ярусам статей (FT-010 ТЗ-3).
 *
 * Таблица приходит готовой: одна на экран и выгрузки, чтобы увиденное не
 * расходилось с выгруженным.
 */
export function useManagerialPnlTable(query: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, 'MANAGERIAL_PNL_TABLE', query],
    {
      method: 'get',
      url: '/reports/managerial-profit-loss',
      params: query,
      headers: { Accept: 'application/json+table' },
    },
    { select: (res: any) => res.data, ...props },
  );
}

export const useManagerialPnlCsvExport = (query: any, args?: any) =>
  useDownloadFile({
    url: '/reports/managerial-profit-loss',
    config: { headers: { accept: 'application/csv' }, params: query },
    filename: 'managerial_profit_loss.csv',
    ...args,
  });

export const useManagerialPnlXlsxExport = (query: any, args?: any) =>
  useDownloadFile({
    url: '/reports/managerial-profit-loss',
    config: { headers: { accept: 'application/xlsx' }, params: query },
    filename: 'managerial_profit_loss.xlsx',
    ...args,
  });
