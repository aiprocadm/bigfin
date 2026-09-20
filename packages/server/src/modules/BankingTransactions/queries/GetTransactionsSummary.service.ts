// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { formatNumber } from '@/utils/format-number';
import { TRANSFER_TYPES } from '@/modules/Budgets/constants';

import { applyTransactionFilters } from '../utils/applyTransactionFilters';

export interface TransactionsSummaryMoney {
  amount: number;
  formatted: string;
}

export interface TransactionsSummary {
  count: number;
  inflow: TransactionsSummaryMoney;
  outflow: TransactionsSummaryMoney;
  transfers: TransactionsSummaryMoney;
  net: TransactionsSummaryMoney;
  /** В выборке есть операции в валюте, отличной от валюты учёта. */
  hasForeignCurrency: boolean;
  currencyCode: string;
}

/**
 * Итоги реестра операций (FIN-008 ТЗ-2).
 *
 * ЗАЧЕМ. Наложив фильтр, человек не знал, сколько операций попало в выборку
 * и на какую сумму, — и выгружал в Excel, чтобы сложить. Ответ «сколько и на
 * сколько» должен быть под любым фильтром без единого щелчка.
 *
 * ОТДЕЛЬНАЯ ЛЁГКАЯ РУЧКА, а не поле в ответе списка: список идёт
 * бесконечной прокруткой, и тащить агрегаты в каждую страницу значит
 * пересчитывать их на каждый скролл.
 *
 * ПЕРЕВОДЫ НЕ ВХОДЯТ В ИТОГ. Перевод со своего счёта на свой денег бизнесу
 * не прибавляет; попади он в «поступления», итог показал бы рост, которого
 * не было. Показывается отдельным числом — чтобы его наличие было видно.
 */
@Injectable()
export class GetTransactionsSummaryService {
  constructor(
    private readonly tenancyContext: TenancyContext,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  public async getSummary(filters: any): Promise<TransactionsSummary> {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency ?? 'RUB';

    const articleAccountIds = await this.resolveArticleAccounts(
      filters?.articleId,
    );

    const rows: any[] = await this.transactionModel()
      .query()
      .onBuild((query: any) => {
        applyTransactionFilters(query, filters ?? {}, articleAccountIds);
      });

    const transferTypes = new Set<string>(
      TRANSFER_TYPES as unknown as string[],
    );

    let inflow = 0;
    let outflow = 0;
    let transfers = 0;
    let hasForeignCurrency = false;

    rows.forEach((row: any) => {
      const debit = Number(row.debit ?? 0);
      const credit = Number(row.credit ?? 0);

      if (
        row.currencyCode &&
        String(row.currencyCode) !== String(currencyCode)
      ) {
        hasForeignCurrency = true;
      }

      if (transferTypes.has(String(row.transactionType))) {
        transfers += debit + credit;
        return;
      }

      inflow += debit;
      outflow += credit;
    });

    const money = (amount: number): TransactionsSummaryMoney => ({
      amount: Math.round(amount * 100) / 100,
      formatted: formatNumber(amount, { currencyCode, money: true }),
    });

    return {
      count: rows.length,
      inflow: money(inflow),
      outflow: money(outflow),
      transfers: money(transfers),
      // Равенство «поступления минус выплаты = итог» обязано сходиться до
      // копейки: человек проверит его глазами первым делом.
      net: money(inflow - outflow),
      hasForeignCurrency,
      currencyCode,
    };
  }

  /** Статья вместе с подстатьями → её счета; `null` — отбора нет. */
  private async resolveArticleAccounts(
    articleId?: number,
  ): Promise<number[] | null> {
    if (!articleId) return null;

    const all: any[] = await this.articleModel().query();
    const childrenByParent = new Map<number, number[]>();

    all.forEach((article: any) => {
      const parentId = article.parentId ?? null;
      if (parentId == null) return;
      childrenByParent.set(parentId, [
        ...(childrenByParent.get(parentId) ?? []),
        article.id,
      ]);
    });

    const ids: number[] = [];
    const stack: number[] = [Number(articleId)];
    const seen = new Set<number>();

    while (stack.length > 0) {
      const current = stack.pop() as number;
      if (seen.has(current)) continue;
      seen.add(current);
      ids.push(current);
      (childrenByParent.get(current) ?? []).forEach((id) => stack.push(id));
    }

    const links: any[] = await this.articleAccountModel()
      .query()
      .whereIn('articleId', ids);

    return [...new Set(links.map((link: any) => link.accountId))];
  }
}
