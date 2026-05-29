import { Inject, Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { ArticlesRollupQueryDto } from '../dtos/ArticlesRollupQuery.dto';

interface ArticleRollupRow {
  id: number;
  name: string;
  kind: string;
  amount: number;
  [key: string]: any;
}

/**
 * Pure fold: distribute per-account nets into their mapped articles.
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
  ) {}

  /**
   * Builds the management "P&L by articles" rollup for a date range / branches.
   * Fact is computed per account (credit - debit), then folded into articles
   * by the management_article_accounts map.
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

        if (query.fromDate && query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
        if (!isEmpty(query.branchesIds)) {
          qb.modify('filterByBranches', query.branchesIds);
        }
      });

    const accountNets = accountTotals.map((row: any) => ({
      accountId: row.accountId,
      net: Number(row.credit ?? 0) - Number(row.debit ?? 0),
    }));

    return foldAccountsIntoArticles(articles, map, accountNets);
  }
}
