// © 2026 Bigfin
import { CashFlowArticlesReport } from './buildCashFlowArticlesReport';
import { CashFlowDateGroup, ReportPeriod } from './periodizeRows';
import { INumberFormatQuery } from '../../types/Report.types';

export interface ICashFlowArticlesQuery {
  fromDate: Date | string;
  toDate: Date | string;
  branchesIds?: number[];
  legalEntityIds?: number[];
  projectsIds?: number[];
  /** Масштаб колонок; по умолчанию месяцы (FT-001 ТЗ-3). */
  dateGroup?: CashFlowDateGroup;
  /** Колонка «Итого»; по умолчанию есть. */
  showTotalColumn?: boolean;
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

/** Колонка-период матрицы: границы, подпись и отчёт за этот период. */
export interface ICashFlowArticlesPeriod extends ReportPeriod {
  report: CashFlowArticlesReport;
}

/**
 * Данные отчёта. Сам объект — это колонка «Итого» (прежний ответ целиком,
 * поэтому всё, что читало отчёт до матрицы, читает его и сейчас), а
 * `periods` — колонки-периоды.
 */
export interface ICashFlowArticlesData extends CashFlowArticlesReport {
  dateGroup: CashFlowDateGroup;
  periods: ICashFlowArticlesPeriod[];
  /** Остаток на конец каждой колонки равен остатку на начало следующей. */
  isChained: boolean;
}

export interface ICashFlowArticlesSheet {
  data: ICashFlowArticlesData;
  query: ICashFlowArticlesQuery;
  meta: ICashFlowArticlesMeta;
}
