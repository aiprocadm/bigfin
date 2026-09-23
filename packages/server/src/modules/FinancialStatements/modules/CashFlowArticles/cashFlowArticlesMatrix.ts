// © 2026 Bigfin
import {
  ArticleAmount,
  buildCashFlowArticlesReport,
  CashFlowArticleRow,
  CashFlowArticlesReport,
  ReportArticle,
} from './buildCashFlowArticlesReport';
import { CashFlowDateGroup, ReportPeriod } from './periodizeRows';

/**
 * Матрица отчёта «Деньги по статьям»: статьи × периоды + «Итого» (FT-001 ТЗ-3).
 *
 * РАСЧЁТ ПЕРИОДА НЕ ДУБЛИРУЕТСЯ. Каждая колонка — это обычный отчёт
 * `buildCashFlowArticlesReport` за свой период: равенство «начало + поток =
 * конец», строка «не разнесено» и итоги по корням уже проверены там.
 *
 * «ИТОГО» СКЛАДЫВАЕТСЯ ИЗ КОЛОНОК, а не считается заново за весь отрезок.
 * Итог, посчитанный отдельно, однажды разошёлся бы с суммой колонок на
 * копейку — а человек сложит колонки на калькуляторе. Остаток на начало в
 * «Итого» — остаток на начало первого периода, на конец — конец последнего
 * (у конкурента эти ячейки пусты — здесь в них честные числа).
 */

export interface MatrixPeriodInput extends ReportPeriod {
  amounts: ArticleAmount[];
  openingBalance: number;
  closingBalance: number;
  transfers: { incoming: number; outgoing: number };
}

export interface MatrixPeriod extends ReportPeriod {
  report: CashFlowArticlesReport;
}

export interface CashFlowArticlesMatrix {
  dateGroup: CashFlowDateGroup;
  periods: MatrixPeriod[];
  /** Колонка «Итого» — тот же отчёт, сложенный из колонок. */
  total: CashFlowArticlesReport;
  /**
   * Цепочка периодов не разорвана: остаток на конец каждого равен остатку на
   * начало следующего. Держится конструкцией — поле есть, чтобы разрыв был
   * виден, а не молчал.
   */
  isChained: boolean;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Суммы статей по всем периодам: сложение уже округлённых колонок. */
function sumAmounts(periods: MatrixPeriodInput[]): ArticleAmount[] {
  const totals = new Map<number, number>();

  periods.forEach((period) => {
    period.amounts.forEach(({ id, amount }) => {
      totals.set(id, round2((totals.get(id) ?? 0) + round2(Number(amount) || 0)));
    });
  });

  return Array.from(totals.entries()).map(([id, amount]) => ({ id, amount }));
}

export function buildCashFlowArticlesMatrix(input: {
  articles: ReportArticle[];
  dateGroup: CashFlowDateGroup;
  periods: MatrixPeriodInput[];
}): CashFlowArticlesMatrix {
  const { articles, dateGroup } = input;
  const inputs = input.periods ?? [];

  const periods: MatrixPeriod[] = inputs.map(
    ({ amounts, openingBalance, closingBalance, transfers, ...period }) => ({
      ...period,
      report: buildCashFlowArticlesReport({
        articles,
        amounts,
        openingBalance,
        closingBalance,
        transfers,
      }),
    }),
  );

  const first = inputs[0];
  const last = inputs[inputs.length - 1];

  const total = buildCashFlowArticlesReport({
    articles,
    amounts: sumAmounts(inputs),
    openingBalance: first?.openingBalance ?? 0,
    closingBalance: last?.closingBalance ?? 0,
    transfers: {
      incoming: round2(
        inputs.reduce((sum, p) => sum + (p.transfers?.incoming ?? 0), 0),
      ),
      outgoing: round2(
        inputs.reduce((sum, p) => sum + (p.transfers?.outgoing ?? 0), 0),
      ),
    },
  });

  const isChained = periods.every(
    (period, index) =>
      index === 0 ||
      period.report.openingBalance === periods[index - 1].report.closingBalance,
  );

  return { dateGroup, periods, total, isChained };
}

/**
 * Значения строк отчёта по устойчивым ключам — тем же, что у строк таблицы.
 *
 * Все колонки матрицы устроены одинаково (одни и те же статьи), поэтому
 * строка таблицы строится по «Итого», а значение в каждой колонке
 * находится по ключу строки.
 */
export function reportValuesByRowKey(
  report: CashFlowArticlesReport,
): Map<string, number> {
  const values = new Map<string, number>();

  const walk = (rows: CashFlowArticleRow[]) => {
    rows.forEach((row) => {
      values.set(`article-${row.id}`, row.amount);
      walk(row.children);
    });
  };

  values.set('opening', report.openingBalance);
  report.sections.forEach((section) => {
    values.set(`section-${section.section}`, section.total);
    values.set(`inflow-${section.section}`, section.inflow.total);
    values.set(`outflow-${section.section}`, section.outflow.total);
    walk(section.inflow.rows);
    walk(section.outflow.rows);
  });
  values.set('unclassified', report.unclassified);
  values.set('net', report.netCashFlow);
  values.set('closing', report.closingBalance);
  values.set('transfers', report.transfers.total);
  values.set('transfers-in', report.transfers.incoming);
  values.set('transfers-out', report.transfers.outgoing);

  return values;
}
