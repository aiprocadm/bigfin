// © 2026 Bigfin
import { CashRollupLeg } from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { CashFlowArticlesReport } from '../buildCashFlowArticlesReport';
import { byArticles } from './byArticles';
import { CashGroupNode, round2 } from './cashGroupNodes';

/**
 * Группировка «Направления и статьи»: направление → Поступления / Выплаты →
 * статья (FT-002 ТЗ-3).
 *
 * Ноги раскладываются по направлению, и каждая кучка сворачивается в статьи
 * ТЕМ ЖЕ кодом, что и вкладка «по статьям». Отдельного расчёта «статьи
 * внутри направления» нет: он однажды разошёлся бы с общим.
 *
 * «Без направления» — обязательная строка: на ней видно, сколько денег
 * осталось непомеченными, и её нельзя спрятать даже пустой.
 */
export function byDirectionsArticles(
  legs: CashRollupLeg[],
  foldToReport: (legs: CashRollupLeg[]) => CashFlowArticlesReport,
  nameOf: (projectId: number) => string | undefined,
): CashGroupNode[] {
  const byProject = new Map<number | null, CashRollupLeg[]>();
  legs.forEach((leg) => {
    const key = leg.projectId === undefined || leg.projectId === null
      ? null
      : Number(leg.projectId);
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(leg);
  });
  if (!byProject.has(null)) byProject.set(null, []);

  const nodes: CashGroupNode[] = [];
  byProject.forEach((projectLegs, projectId) => {
    const prefix = projectId === null ? 'direction-none-' : `direction-${projectId}-`;
    const children = byArticles(foldToReport(projectLegs), prefix);
    const [inflow, outflow] = children;

    nodes.push({
      id: projectId === null ? 'direction-none' : `direction-${projectId}`,
      name:
        projectId === null
          ? 'Без направления'
          : (nameOf(projectId) ?? `№ ${projectId}`),
      labelKey:
        projectId === null ? 'cash_flow_articles.no_direction' : undefined,
      rowType: 'DIRECTION',
      amount: round2(inflow.amount - outflow.amount),
      children,
      isNone: projectId === null,
    });
  });

  return nodes;
}
