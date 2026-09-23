// © 2026 Bigfin
import { GroupedCashReport } from './cashFlowArticlesMatrix';
import { CashFlowGrouping } from './groupings/cashGroupNodes';
import { CashFlowDateGroup, ReportPeriod } from './periodizeRows';
import { INumberFormatQuery } from '../../types/Report.types';

export interface ICashFlowArticlesQuery {
  fromDate: Date | string;
  toDate: Date | string;
  branchesIds?: number[];
  legalEntityIds?: number[];
  projectsIds?: number[];
  /** Группировка строк; по умолчанию статьи (FT-002 ТЗ-3). */
  group?: CashFlowGrouping;
  /** Масштаб колонок; по умолчанию месяцы (FT-001 ТЗ-3). */
  dateGroup?: CashFlowDateGroup;
  /** Колонка «Итого»; по умолчанию есть. */
  showTotalColumn?: boolean;
  /** Строки с нулём во всех колонках; по умолчанию спрятаны (FT-005). */
  showEmpty?: boolean;
  /** Переводы между своими счетами; по умолчанию спрятаны (FT-006). */
  showTransfers?: boolean;
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
  report: GroupedCashReport;
}

/**
 * Данные отчёта. Сам объект — это колонка «Итого» (прежний ответ целиком,
 * поэтому всё, что читало отчёт до матрицы, читает его и сейчас), а
 * `periods` — колонки-периоды.
 */
export interface ICashFlowArticlesData extends GroupedCashReport {
  group: CashFlowGrouping;
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
