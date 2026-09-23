// © 2026 Bigfin
import { resolvePlType } from '@/modules/ManagementArticles/utils/plTypes';
import {
  computeManagerialTiers,
  ManagerialPlType,
  ManagerialTiers,
  Margin,
  MANAGERIAL_PL_TYPES,
} from './computeManagerialTiers';
import { PnlEntry } from './ManagerialPnlSource.service';

/**
 * Строки управленческого ОПиУ (FT-010 ТЗ-3) за одну колонку.
 *
 * ПОРЯДОК СТРОК — ЛЕСТНИЦА: группа расходов, под ней итог яруса и строка
 * рентабельности. Итог стоит СРАЗУ под тем, что его уменьшило: человек
 * читает сверху вниз и видит, куда ушла выручка.
 *
 * СТАТЬЯ — В СВОЁМ ЯРУСЕ. Ярус статьи — её `pl_type` или ярус ближайшего
 * предка. Дочерняя статья со своим ярусом уходит в свой ярус, а не тянется
 * за родителем: иначе один и тот же расход попал бы в два яруса.
 */

export const PNL_GROUPINGS = ['articles', 'directions', 'directions_articles'] as const;
export type PnlGrouping = (typeof PNL_GROUPINGS)[number];

export type PnlRowType =
  | 'PL_GROUP'
  | 'PL_TOTAL'
  | 'PL_METRIC'
  | 'ARTICLE'
  | 'DIRECTION'
  | 'ACCOUNT'
  | 'UNASSIGNED';

export interface PnlNode {
  id: string;
  name: string;
  labelKey?: string;
  rowType: PnlRowType;
  /** Деньги; у строки рентабельности — процент или `null` («н/о»). */
  amount: number | null;
  children: PnlNode[];
  /** Ярус, к которому относится строка (для раскрытия до операций). */
  plType?: ManagerialPlType;
  isNone?: boolean;
}

export interface ManagerialPnlColumn {
  rows: PnlNode[];
  tiers: ManagerialTiers;
  /** Суммы по ярусам — вход расчёта. */
  amounts: Record<ManagerialPlType, number>;
  /** Не отнесено к ярусу: влияние на прибыль со знаком. */
  unassigned: number;
}

export interface BuildContext {
  articles: any[];
  group: PnlGrouping;
  projectName: (id: number) => string | undefined;
  accountName: (id: number) => string | undefined;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Подписи ярусов — запасные, для выгрузок; экран подписывает по ключу. */
const GROUP_LABELS: Record<ManagerialPlType, string> = {
  revenue: 'Выручка',
  direct_variable: 'Прямые переменные расходы',
  direct_production: 'Прямые производственные расходы',
  overhead_production: 'Общепроизводственные расходы',
  administrative: 'Административные расходы',
  commercial: 'Коммерческие расходы',
  other_income_below_ebitda: 'Доходы ниже EBITDA',
  below_ebitda: 'Расходы ниже EBITDA',
  below_net_profit: 'Расходы ниже чистой прибыли',
};

const TOTALS = {
  md: 'Маржинальный доход',
  gp1: 'Валовая прибыль по направлениям',
  gp2: 'Валовая прибыль общая',
  op: 'Операционная прибыль (EBITDA)',
  np: 'Чистая прибыль',
} as const;

type TotalKey = keyof typeof TOTALS;

/** Ярус каждой статьи с учётом наследования; кэш на одну сборку. */
function tiersOfArticles(articles: any[]): Map<number, string | null> {
  const result = new Map<number, string | null>();
  articles.forEach((article) =>
    result.set(article.id, resolvePlType(article.id, articles).plType),
  );
  return result;
}

/** Собственные суммы статей и направлений из записей колонки. */
function ownAmounts(entries: PnlEntry[]) {
  const byArticle = new Map<number, number>();
  const byArticleProject = new Map<string, number>();
  entries.forEach((entry) => {
    if (entry.articleId === null) return;
    byArticle.set(entry.articleId, (byArticle.get(entry.articleId) ?? 0) + entry.amount);
    const key = `${entry.articleId}:${entry.projectId ?? 'none'}`;
    byArticleProject.set(key, (byArticleProject.get(key) ?? 0) + entry.amount);
  });
  return { byArticle, byArticleProject };
}

/**
 * Дерево статей одного яруса. Родитель строки — ближайший предок ТОГО ЖЕ
 * яруса; сумма строки — своя плюс сумма детей этого яруса.
 */
function articleTree(
  articles: any[],
  tierOf: Map<number, string | null>,
  tier: string,
  amountOf: (articleId: number) => number,
  idPrefix: string,
  plType: ManagerialPlType,
): PnlNode[] {
  const byId = new Map<number, any>(articles.map((a) => [a.id, a]));
  const inTier = articles.filter((a) => tierOf.get(a.id) === tier);

  const displayParent = (article: any): number | null => {
    const seen = new Set<number>();
    let parentId = article.parentId ?? null;
    while (parentId != null && !seen.has(parentId)) {
      seen.add(parentId);
      if (tierOf.get(parentId) === tier) return parentId;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return null;
  };

  const build = (parentId: number | null): PnlNode[] =>
    inTier
      .filter((article) => displayParent(article) === parentId)
      .map((article) => {
        const children = build(article.id);
        const amount = round2(
          amountOf(article.id) +
            children.reduce((sum, child) => sum + (child.amount ?? 0), 0),
        );
        return {
          id: `${idPrefix}article-${article.id}`,
          name: article.name,
          rowType: 'ARTICLE' as const,
          amount,
          children,
          plType,
        };
      });

  return build(null);
}

/** Направления колонки — в порядке первого появления, «без» последним. */
function projectsOf(entries: PnlEntry[]): Array<number | null> {
  const ids: number[] = [];
  entries.forEach((entry) => {
    if (entry.projectId != null && !ids.includes(entry.projectId)) ids.push(entry.projectId);
  });
  return [...ids, null];
}

export function buildManagerialPnlColumn(
  entries: PnlEntry[],
  context: BuildContext,
): ManagerialPnlColumn {
  const { articles, group } = context;
  const tierOf = tiersOfArticles(articles);
  const { byArticle, byArticleProject } = ownAmounts(entries);
  const projects = projectsOf(entries);

  const amounts = {} as Record<ManagerialPlType, number>;
  MANAGERIAL_PL_TYPES.forEach((type) => {
    amounts[type] = round2(
      entries.reduce(
        (sum, entry) =>
          entry.articleId !== null && tierOf.get(entry.articleId) === type
            ? sum + entry.amount
            : sum,
        0,
      ),
    );
  });

  const groupChildren = (type: ManagerialPlType): PnlNode[] => {
    if (group === 'articles') {
      return articleTree(articles, tierOf, type, (id) => byArticle.get(id) ?? 0, '', type);
    }

    return projects.map((projectId) => {
      const projectKey = projectId ?? 'none';
      const amountOf = (id: number) => byArticleProject.get(`${id}:${projectKey}`) ?? 0;
      const children =
        group === 'directions_articles'
          ? articleTree(articles, tierOf, type, amountOf, `direction-${projectKey}-`, type)
          : [];
      const amount = round2(
        entries.reduce(
          (sum, entry) =>
            entry.articleId !== null &&
            tierOf.get(entry.articleId) === type &&
            (entry.projectId ?? 'none') === projectKey
              ? sum + entry.amount
              : sum,
          0,
        ),
      );
      return {
        id: `${type}-direction-${projectKey}`,
        name:
          projectId === null
            ? 'Без направления'
            : (context.projectName(projectId) ?? `№ ${projectId}`),
        labelKey: projectId === null ? 'cash_flow_articles.no_direction' : undefined,
        rowType: 'DIRECTION' as const,
        amount,
        children,
        plType: type,
        isNone: projectId === null,
      };
    });
  };

  const groupRow = (type: ManagerialPlType): PnlNode => ({
    id: type,
    name: GROUP_LABELS[type],
    labelKey: `managerial_pnl.row.${type}`,
    rowType: 'PL_GROUP',
    amount: amounts[type],
    children: groupChildren(type),
    plType: type,
  });

  const tiers = computeManagerialTiers(amounts);
  const totalRow = (key: TotalKey): PnlNode => ({
    id: key,
    name: TOTALS[key],
    labelKey: `managerial_pnl.row.${key}`,
    rowType: 'PL_TOTAL',
    amount: tiers[key],
    children: [],
  });
  const marginRow = (key: TotalKey): PnlNode => {
    const margin: Margin = tiers.margins[key];
    return {
      id: `${key}_margin`,
      name: `Рентабельность: ${TOTALS[key].toLowerCase()}`,
      labelKey: `managerial_pnl.row.${key}_margin`,
      rowType: 'PL_METRIC',
      amount: margin.applicable ? margin.value : null,
      children: [],
    };
  };

  // Не отнесено к ярусу: статьи без яруса и счета без статьи — со знаком
  // влияния на прибыль. Строка стоит под чистой прибылью и в неё НЕ входит:
  // человек видит, сколько денег лестница не объяснила, и идёт разметить.
  const unassignedChildren: PnlNode[] = [];
  articles
    .filter((article) => tierOf.get(article.id) === null)
    .forEach((article) => {
      const own = byArticle.get(article.id) ?? 0;
      if (!own) return;
      unassignedChildren.push({
        id: `article-${article.id}`,
        name: article.name,
        rowType: 'ARTICLE',
        amount: round2(article.kind === 'income' ? own : -own),
        children: [],
      });
    });
  const byAccount = new Map<number, number>();
  entries
    .filter((entry) => entry.articleId === null)
    .forEach((entry) =>
      byAccount.set(entry.accountId, (byAccount.get(entry.accountId) ?? 0) + entry.amount),
    );
  byAccount.forEach((amount, accountId) =>
    unassignedChildren.push({
      id: `account-${accountId}`,
      name: context.accountName(accountId) ?? `№ ${accountId}`,
      rowType: 'ACCOUNT',
      amount: round2(amount),
      children: [],
    }),
  );
  const unassigned = round2(
    unassignedChildren.reduce((sum, node) => sum + (node.amount ?? 0), 0),
  );

  const rows: PnlNode[] = [
    groupRow('revenue'),
    groupRow('direct_variable'),
    totalRow('md'),
    marginRow('md'),
    groupRow('direct_production'),
    totalRow('gp1'),
    marginRow('gp1'),
    groupRow('overhead_production'),
    totalRow('gp2'),
    marginRow('gp2'),
    groupRow('administrative'),
    groupRow('commercial'),
    totalRow('op'),
    marginRow('op'),
    groupRow('other_income_below_ebitda'),
    groupRow('below_ebitda'),
    totalRow('np'),
    marginRow('np'),
    groupRow('below_net_profit'),
    {
      id: 'unassigned',
      name: 'Не отнесено к ярусу',
      labelKey: 'managerial_pnl.row.unassigned',
      rowType: 'UNASSIGNED',
      amount: unassigned,
      children: unassignedChildren,
    },
  ];

  return { rows, tiers, amounts, unassigned };
}
