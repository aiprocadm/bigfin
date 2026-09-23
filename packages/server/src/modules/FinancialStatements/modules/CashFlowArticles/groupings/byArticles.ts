// © 2026 Bigfin
import {
  CashFlowArticleRow,
  CashFlowArticlesReport,
} from '../buildCashFlowArticlesReport';
import { CashGroupNode, round2 } from './cashGroupNodes';

/**
 * Группировки «по статьям» и «по видам деятельности» (FT-002 ТЗ-3).
 *
 * Обе берут готовый отчёт по статьям — тот, что считался и раньше, — и лишь
 * по-разному раскладывают его строки:
 *
 * - `articles` (по умолчанию): Поступления / Выплаты → статья → субстатья;
 * - `activity`: вид деятельности → Поступления / Выплаты → статья.
 *
 * Сумма строк от раскладки не зависит — статьи те же самые.
 */

/** Дерево статей отчёта → строки с ключом `<prefix>article-<id>`. */
export function articleNodes(
  rows: CashFlowArticleRow[],
  prefix = '',
): CashGroupNode[] {
  return rows.map((row) => ({
    id: `${prefix}article-${row.id}`,
    name: row.name,
    rowType: 'ARTICLE',
    amount: row.amount,
    children: articleNodes(row.children, prefix),
  }));
}

/** Поступления / Выплаты → статьи, без разделов деятельности. */
export function byArticles(
  report: CashFlowArticlesReport,
  prefix = '',
): CashGroupNode[] {
  const sections = report.sections;

  return [
    {
      id: `${prefix}inflow`,
      name: 'Поступления',
      labelKey: 'cash_flow_articles.inflow',
      rowType: 'INFLOW',
      amount: round2(sections.reduce((sum, s) => sum + s.inflow.total, 0)),
      children: sections.flatMap((s) => articleNodes(s.inflow.rows, prefix)),
    },
    {
      id: `${prefix}outflow`,
      name: 'Выплаты',
      labelKey: 'cash_flow_articles.outflow',
      rowType: 'OUTFLOW',
      amount: round2(sections.reduce((sum, s) => sum + s.outflow.total, 0)),
      children: sections.flatMap((s) => articleNodes(s.outflow.rows, prefix)),
    },
  ];
}

const SECTION_LABELS: Record<string, string> = {
  operating: 'Операционная деятельность',
  investing: 'Инвестиционная деятельность',
  financing: 'Финансовая деятельность',
};

/** Вид деятельности → Поступления / Выплаты → статьи. */
export function byActivity(report: CashFlowArticlesReport): CashGroupNode[] {
  return report.sections.map((section) => ({
    id: `section-${section.section}`,
    name: SECTION_LABELS[section.section] ?? section.section,
    labelKey: `cash_flow_articles.section.${section.section}`,
    rowType: 'SECTION',
    amount: section.total,
    children: [
      {
        id: `inflow-${section.section}`,
        name: 'Поступления',
        labelKey: 'cash_flow_articles.inflow',
        rowType: 'INFLOW',
        amount: section.inflow.total,
        children: articleNodes(section.inflow.rows),
      },
      {
        id: `outflow-${section.section}`,
        name: 'Выплаты',
        labelKey: 'cash_flow_articles.outflow',
        rowType: 'OUTFLOW',
        amount: section.outflow.total,
        children: articleNodes(section.outflow.rows),
      },
    ],
  }));
}
