import { useRequestQuery } from '../../useQueryRequest';
import { useDownloadFile } from '../../useDownloadFile';
import { useRequestPdf } from '../../useRequestPdf';
import t from '../types';

/**
 * Отчёт «Деньги (ДДС по статьям)» — прямой метод (FIN-013 ТЗ-2).
 *
 * Тот же расчёт, что питает график на главной: график и таблица наконец
 * показывают одно и то же.
 */
export function useCashFlowArticles(query: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, 'CASH_FLOW_ARTICLES', query],
    {
      method: 'get',
      url: '/reports/cash-flow-articles',
      params: query,
    },
    { ...props },
  );
}

/** Табличный вид — им же выгружаются CSV, XLSX и PDF. */
export function useCashFlowArticlesTable(query: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, 'CASH_FLOW_ARTICLES_TABLE', query],
    {
      method: 'get',
      url: '/reports/cash-flow-articles',
      params: query,
      headers: { Accept: 'application/json+table' },
    },
    { select: (res: any) => res.data, ...props },
  );
}

export const useCashFlowArticlesCsvExport = (query: any, args?: any) =>
  useDownloadFile({
    url: '/reports/cash-flow-articles',
    config: { headers: { accept: 'application/csv' }, params: query },
    filename: 'cash_flow_articles.csv',
    ...args,
  });

export const useCashFlowArticlesXlsxExport = (query: any, args?: any) =>
  useDownloadFile({
    url: '/reports/cash-flow-articles',
    config: { headers: { accept: 'application/xlsx' }, params: query },
    filename: 'cash_flow_articles.xlsx',
    ...args,
  });

export const useCashFlowArticlesPdfExport = (query = {}) =>
  useRequestPdf({ url: '/reports/cash-flow-articles', params: query });
