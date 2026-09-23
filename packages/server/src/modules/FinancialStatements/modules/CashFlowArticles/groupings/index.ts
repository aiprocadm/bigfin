// © 2026 Bigfin
import { CashRollupLeg } from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { CashFlowArticlesReport } from '../buildCashFlowArticlesReport';
import { byActivity, byArticles } from './byArticles';
import { byDirectionsArticles } from './byDirectionsArticles';
import { byLegDimension } from './byLegDimension';
import { CashFlowGrouping, CashGroupNode } from './cashGroupNodes';

export * from './cashGroupNodes';
export { sortDimensionRows } from './byLegDimension';

/** Всё, что нужно группировке, чтобы разложить одну колонку. */
export interface GroupingContext {
  /** Отчёт колонки по статьям — готовый, его же рисует вкладка «статьи». */
  report: CashFlowArticlesReport;
  /** Ноги колонки. */
  legs: CashRollupLeg[];
  settledKeys: Set<string>;
  isCashAccount: (accountId: number) => boolean;
  /** Ноги → отчёт по статьям тем же кодом, что и вся вкладка «статьи». */
  foldToReport: (legs: CashRollupLeg[]) => CashFlowArticlesReport;
  names: {
    contacts: Map<number, string>;
    accounts: Map<number, string>;
    projects: Map<number, string>;
  };
}

/** Строки одной колонки в выбранной группировке. */
export function groupingRows(
  group: CashFlowGrouping,
  context: GroupingContext,
): CashGroupNode[] {
  const { legs, settledKeys, isCashAccount, names } = context;

  switch (group) {
    case 'activity':
      return byActivity(context.report);
    case 'contacts':
      return byLegDimension(legs, settledKeys, isCashAccount, {
        side: 'noncash',
        keyOf: (leg) => leg.contactId,
        nameOf: (id) => names.contacts.get(id),
        kind: 'contact',
        rowType: 'CONTACT',
        none: {
          name: 'Без контрагента',
          labelKey: 'cash_flow_articles.no_contact',
        },
      });
    case 'accounts':
      return byLegDimension(legs, settledKeys, isCashAccount, {
        side: 'cash',
        keyOf: (leg) => leg.accountId,
        nameOf: (id) => names.accounts.get(id),
        kind: 'account',
        rowType: 'ACCOUNT',
      });
    case 'directions':
      return byLegDimension(legs, settledKeys, isCashAccount, {
        side: 'noncash',
        keyOf: (leg) => leg.projectId,
        nameOf: (id) => names.projects.get(id),
        kind: 'direction',
        rowType: 'DIRECTION',
        none: {
          name: 'Без направления',
          labelKey: 'cash_flow_articles.no_direction',
        },
      });
    case 'directions_articles':
      return byDirectionsArticles(legs, context.foldToReport, (id) =>
        names.projects.get(id),
      );
    case 'articles':
    default:
      return byArticles(context.report);
  }
}
