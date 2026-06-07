import { Inject, Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { ArticlesRollupQueryDto } from '../dtos/ArticlesRollupQuery.dto';

interface ArticleRollupRow {
  id: number;
  name: string;
  kind: string;
  parentId?: number | null;
  amount: number;
  [key: string]: any;
}

/**
 * Normal-aware net for a single account, mirroring Ledger.getAmount:
 * credit-normal accounts (income) → credit − debit; debit-normal accounts
 * (expense) → debit − credit. So income AND expense both come out POSITIVE
 * (the management P&L shows expenses as positive magnitudes; profit is
 * computed as income − expense by the consumer).
 * @param {number} credit
 * @param {number} debit
 * @param {string} [normal] - 'credit' | 'debit'
 * @returns {number}
 */
export function accountNet(
  credit: number,
  debit: number,
  normal?: string,
): number {
  const c = Number(credit ?? 0);
  const d = Number(debit ?? 0);
  return normal === 'credit' ? c - d : d - c;
}

/**
 * Pure fold: distribute per-account nets into their directly-mapped articles.
 * Accounts without a mapping are ignored (kept off the management report).
 * @param {Array} articles
 * @param {Array<{ accountId: number; articleId: number }>} map
 * @param {Array<{ accountId: number; net: number }>} accountNets
 * @returns {ArticleRollupRow[]}
 */
export function foldAccountsIntoArticles(
  articles: any[],
  map: { accountId: number; articleId: number }[],
  accountNets: { accountId: number; net: number }[],
): ArticleRollupRow[] {
  const accountToArticle = new Map<number, number>();
  map.forEach((m) => accountToArticle.set(m.accountId, m.articleId));

  const totals = new Map<number, number>();
  articles.forEach((a) => totals.set(a.id, 0));

  accountNets.forEach(({ accountId, net }) => {
    const articleId = accountToArticle.get(accountId);
    if (articleId == null) return; // unmapped account
    totals.set(articleId, (totals.get(articleId) ?? 0) + net);
  });

  return articles.map((a) => ({ ...a, amount: totals.get(a.id) ?? 0 }));
}

/**
 * Rolls each article's own amount up into all of its ancestors, so a parent
 * article reports the total of its whole subtree (its own mapped accounts plus
 * every descendant). Guards against malformed parent cycles via a visited set.
 * @param {ArticleRollupRow[]} articles - rows carrying their own folded amount
 * @returns {ArticleRollupRow[]}
 */
export function rollupAmountsToAncestors(
  articles: ArticleRollupRow[],
): ArticleRollupRow[] {
  const byId = new Map<number, ArticleRollupRow>();
  articles.forEach((a) => byId.set(a.id, a));

  // Each node's own (directly-mapped) amount, captured before aggregation.
  const own = new Map<number, number>();
  articles.forEach((a) => own.set(a.id, a.amount));

  // Running total per node, seeded with its own amount.
  const total = new Map<number, number>();
  articles.forEach((a) => total.set(a.id, a.amount));

  articles.forEach((a) => {
    let parentId = a.parentId ?? null;
    const visited = new Set<number>();
    while (parentId != null && byId.has(parentId) && !visited.has(parentId)) {
      visited.add(parentId);
      total.set(parentId, (total.get(parentId) ?? 0) + (own.get(a.id) ?? 0));
      parentId = byId.get(parentId)!.parentId ?? null;
    }
  });

  return articles.map((a) => ({ ...a, amount: total.get(a.id) ?? 0 }));
}

@Injectable()
export class ArticlesPlRollupService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Builds the management "P&L by articles" rollup for a date range / branches.
   * Per account the net is computed normal-aware (income and expense both
   * positive), folded into its directly-mapped article, then summed up the
   * article tree so each parent reports its whole subtree.
   * @param {ArticlesRollupQueryDto} query
   * @returns {Promise<ArticleRollupRow[]>}
   */
  public async getRollup(query: ArticlesRollupQueryDto) {
    const articles = await this.articleModel().query().orderBy('sortOrder');
    const map = await this.articleAccountModel().query();

    const accountTotals = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('accountId');
        qb.select(['accountId']);

        // Apply the date filter when EITHER bound is present — the
        // `filterDateRange` modifier guards each bound independently, so an
        // open-ended range (only-from or only-to) is valid.
        if (query.fromDate || query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
        if (!isEmpty(query.branchesIds)) {
          qb.modify('filterByBranches', query.branchesIds);
        }
        if (query.projectId) {
          qb.modify('filterByProjects', [query.projectId]);
        }
        if (query.unassignedProject) {
          qb.whereNull('projectId'); // overhead not tied to any deal
        }
      });

    // Look up each mapped account's normal (credit/debit) to sign its net.
    const mappedAccountIds = map.map((m) => m.accountId);
    const accounts = mappedAccountIds.length
      ? await this.accountModel().query().whereIn('id', mappedAccountIds)
      : [];
    const normalByAccountId = new Map<number, string>();
    accounts.forEach((a: any) =>
      normalByAccountId.set(a.id, a.accountNormal),
    );

    const accountNets = accountTotals.map((row: any) => ({
      accountId: row.accountId,
      net: accountNet(
        row.credit,
        row.debit,
        normalByAccountId.get(row.accountId),
      ),
    }));

    const folded = foldAccountsIntoArticles(articles, map, accountNets);
    return rollupAmountsToAncestors(folded);
  }
}
