// © 2026 Bigfin
import { CashFlowDateGroup, ReportPeriod } from './periodizeRows';
import {
  CashFlowGrouping,
  CashGroupNode,
  explainedFlow,
  mergeNodes,
  nodeValues,
  round2,
} from './groupings/cashGroupNodes';
import { sortDimensionRows } from './groupings/byLegDimension';

/**
 * Матрица отчёта «Деньги по статьям»: строки × периоды + «Итого» (FT-001,
 * FT-002 ТЗ-3).
 *
 * ПОТОК И ОСТАТКИ — С ДЕНЕЖНОЙ СТОРОНЫ. Чистый поток колонки — это конец
 * минус начало по денежным счетам, а не сумма строк. Поэтому он одинаков в
 * любой группировке, а то, что строки не объяснили, видно строкой
 * «Не разнесено».
 *
 * «ИТОГО» СКЛАДЫВАЕТСЯ ИЗ КОЛОНОК, а не считается заново за весь отрезок:
 * сумма колонок на калькуляторе совпадёт с ним копейка в копейку. Остаток
 * на начало в «Итого» — начало первой колонки, на конец — конец последней.
 */

export interface GroupedCashReport {
  openingBalance: number;
  closingBalance: number;
  /** Сколько денег прибавилось: конец минус начало. */
  netCashFlow: number;
  /** Деньги, которые строки группировки не объяснили. */
  unclassified: number;
  /**
   * Сошлось ли «начало + поток = конец». Держится построением; ложь значит
   * поломку данных, и её видно, а не прячем.
   */
  isBalanced: boolean;
  /** Переводы между своими счетами: в потоки не входят, итог — ноль. */
  transfers: { incoming: number; outgoing: number; total: number };
  rows: CashGroupNode[];
}

export interface MatrixPeriodInput extends ReportPeriod {
  rows: CashGroupNode[];
  openingBalance: number;
  closingBalance: number;
  transfers: { incoming: number; outgoing: number };
}

export interface MatrixPeriod extends ReportPeriod {
  report: GroupedCashReport;
}

export interface CashFlowArticlesMatrix {
  group: CashFlowGrouping;
  dateGroup: CashFlowDateGroup;
  periods: MatrixPeriod[];
  /** Колонка «Итого» — сложенная из колонок. */
  total: GroupedCashReport;
  /** Остаток на конец каждой колонки равен остатку на начало следующей. */
  isChained: boolean;
}

export function groupedCashReport(input: {
  rows: CashGroupNode[];
  openingBalance: number;
  closingBalance: number;
  transfers?: { incoming: number; outgoing: number };
}): GroupedCashReport {
  const openingBalance = round2(input.openingBalance);
  const closingBalance = round2(input.closingBalance);
  const netCashFlow = round2(closingBalance - openingBalance);
  const incoming = round2(input.transfers?.incoming ?? 0);
  const outgoing = round2(input.transfers?.outgoing ?? 0);

  return {
    openingBalance,
    closingBalance,
    netCashFlow,
    unclassified: round2(netCashFlow - explainedFlow(input.rows)),
    isBalanced:
      Math.abs(openingBalance + netCashFlow - closingBalance) < 0.005,
    transfers: { incoming, outgoing, total: round2(incoming - outgoing) },
    rows: input.rows,
  };
}

export function buildCashFlowArticlesMatrix(input: {
  group: CashFlowGrouping;
  dateGroup: CashFlowDateGroup;
  periods: MatrixPeriodInput[];
}): CashFlowArticlesMatrix {
  const inputs = input.periods ?? [];

  const periods: MatrixPeriod[] = inputs.map(
    ({ rows, openingBalance, closingBalance, transfers, ...period }) => ({
      ...period,
      report: groupedCashReport({
        rows,
        openingBalance,
        closingBalance,
        transfers,
      }),
    }),
  );

  const first = inputs[0];
  const last = inputs[inputs.length - 1];

  const total = groupedCashReport({
    rows: sortDimensionRows(mergeNodes(inputs.map((period) => period.rows))),
    openingBalance: first?.openingBalance ?? 0,
    closingBalance: last?.closingBalance ?? 0,
    transfers: {
      incoming: inputs.reduce((sum, p) => sum + (p.transfers?.incoming ?? 0), 0),
      outgoing: inputs.reduce((sum, p) => sum + (p.transfers?.outgoing ?? 0), 0),
    },
  });

  const isChained = periods.every(
    (period, index) =>
      index === 0 ||
      period.report.openingBalance === periods[index - 1].report.closingBalance,
  );

  return {
    group: input.group,
    dateGroup: input.dateGroup,
    periods,
    total,
    isChained,
  };
}

/**
 * Значения строк отчёта по устойчивым ключам — тем же, что у строк таблицы.
 *
 * Строка таблицы строится по «Итого» (в нём все строки всех колонок), а
 * значение в каждой колонке находится по ключу; нет ключа — ноль.
 */
export function reportValuesByRowKey(
  report: GroupedCashReport,
): Map<string, number> {
  const values = nodeValues(report.rows);

  values.set('opening', report.openingBalance);
  values.set('unclassified', report.unclassified);
  values.set('net', report.netCashFlow);
  values.set('closing', report.closingBalance);
  values.set('transfers', report.transfers.total);
  values.set('transfers-in', report.transfers.incoming);
  values.set('transfers-out', report.transfers.outgoing);

  return values;
}
