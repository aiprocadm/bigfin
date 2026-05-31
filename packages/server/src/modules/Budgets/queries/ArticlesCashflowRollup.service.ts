import { Inject, Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
// Reuse the Stage-0 pure rollup functions (exported from the P&L rollup service).
import {
  foldAccountsIntoArticles,
  rollupAmountsToAncestors,
  accountNet,
} from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { ArticlesRollupQueryDto } from '@/modules/ManagementArticles/dtos/ArticlesRollupQuery.dto';
import { cashSettledReferenceKeys } from '../utils/cashSettledReferenceKeys';
import { CASH_ACCOUNT_TYPES } from '../constants';

@Injectable()
export class ArticlesCashflowRollupService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * Cash-basis fact rolled up by management article: same fold as the P&L
   * rollup, but only over transactions that were actually cash-settled
   * (reference touched a cash account and is not an internal transfer).
   * @param {ArticlesRollupQueryDto} query
   */
  public async getRollup(query: ArticlesRollupQueryDto) {
    const articles = await this.articleModel().query().orderBy('sortOrder');
    const map = await this.articleAccountModel().query();

    // Денежные счета.
    const cashAccounts = await this.accountModel()
      .query()
      .onBuild((qb) => {
        qb.whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);
      });
    const cashAccountIds = new Set<number>(
      (cashAccounts as any[]).map((a: any) => a.id),
    );
    const isCashAccount = (id: number) => cashAccountIds.has(id);

    // Все проводки периода (для отбора кассово-расчётных reference).
    const periodLegs = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        if (query.fromDate || query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
        if (!isEmpty(query.branchesIds)) {
          qb.modify('filterByBranches', query.branchesIds);
        }
      });

    const settledKeys = cashSettledReferenceKeys(
      periodLegs as any,
      isCashAccount,
    );

    // Обороты по сопоставленным (доходно-расходным) счетам только в этих reference.
    const mappedAccountIds = (map as any[]).map((m: any) => m.accountId);
    const accountTotalsMap = new Map<
      number,
      { credit: number; debit: number }
    >();
    (periodLegs as any[]).forEach((leg) => {
      const key = `${leg.referenceType}:${leg.referenceId}`;
      if (!settledKeys.has(key)) return;
      if (!mappedAccountIds.includes(leg.accountId)) return;
      const cur = accountTotalsMap.get(leg.accountId) || { credit: 0, debit: 0 };
      cur.credit += Number(leg.credit || 0);
      cur.debit += Number(leg.debit || 0);
      accountTotalsMap.set(leg.accountId, cur);
    });

    const accounts = mappedAccountIds.length
      ? await this.accountModel().query().whereIn('id', mappedAccountIds)
      : [];
    const normalByAccountId = new Map<number, string>();
    (accounts as any[]).forEach((a: any) =>
      normalByAccountId.set(a.id, a.accountNormal),
    );

    const accountNets = Array.from(accountTotalsMap.entries()).map(
      ([accountId, t]) => ({
        accountId,
        net: accountNet(t.credit, t.debit, normalByAccountId.get(accountId)),
      }),
    );

    const folded = foldAccountsIntoArticles(articles, map, accountNets);
    return rollupAmountsToAncestors(folded);
  }
}
