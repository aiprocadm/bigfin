// © 2026 Bigfin
import { CashFlowArticlesReport } from './buildCashFlowArticlesReport';
import { INumberFormatQuery } from '../../types/Report.types';

export interface ICashFlowArticlesQuery {
  fromDate: Date | string;
  toDate: Date | string;
  branchesIds?: number[];
  numberFormat?: INumberFormatQuery;
}

export interface ICashFlowArticlesMeta {
  organizationName: string;
  baseCurrency: string;
  dateFormat: string;
  sheetName: string;
  formattedFromDate: string;
  formattedToDate: string;
  formattedDateRange: string;
  [key: string]: any;
}

export interface ICashFlowArticlesSheet {
  data: CashFlowArticlesReport;
  query: ICashFlowArticlesQuery;
  meta: ICashFlowArticlesMeta;
}
