// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { formatNumber } from '@/utils/format-number';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { ArticlesCashflowRollupService } from './ArticlesCashflowRollup.service';
import {
  ArticleReportMap,
  buildArticleReportMap,
} from './buildArticleReportMap';

export interface ArticleReportMapResponse extends ArticleReportMap {
  /** Оборот выбранной статьи за период; `null` — статья не выбрана. */
  turnover: { amount: number; formatted: string } | null;
}

/**
 * Схема «Куда попадает статья» (FIN-002 ТЗ-2).
 *
 * ОБОРОТ СЧИТАЕТСЯ ТЕМ ЖЕ КОДОМ, ЧТО ОТЧЁТ. Схема обещает человеку: «твоя
 * сумма окажется вот в этой строке». Посчитай мы оборот здесь заново — он
 * однажды разойдётся с отчётом, и обещание станет ложью. Поэтому зовём
 * `ArticlesCashflowRollupService`, а не пишем свой расчёт.
 */
@Injectable()
export class GetArticleReportMapService {
  constructor(
    private readonly rollup: ArticlesCashflowRollupService,
    private readonly tenancyContext: TenancyContext,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  public async getReportMap(query: {
    articleId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<ArticleReportMapResponse> {
    if (!query.articleId) {
      return { ...buildArticleReportMap(null), turnover: null };
    }

    const article: any = await this.articleModel()
      .query()
      .findById(query.articleId);

    if (!article) {
      return { ...buildArticleReportMap(null), turnover: null };
    }

    const links: any[] = await this.articleAccountModel()
      .query()
      .where('articleId', article.id);

    const map = buildArticleReportMap({
      id: article.id,
      name: article.name,
      kind: article.kind,
      cashflowSection: article.cashflowSection ?? null,
      hasAccounts: links.length > 0,
    });

    // Статья, которая ни на что не влияет, оборота не имеет по определению:
    // считать его значило бы показать число там, где его быть не может.
    if (map.warning === 'NO_ACCOUNTS') {
      return { ...map, turnover: null };
    }

    const rows: any[] = (await this.rollup.getRollup({
      fromDate: query.fromDate,
      toDate: query.toDate,
    } as any)) as any[];

    const row = rows.find((item: any) => item.id === article.id);
    const amount = Number(row?.amount ?? 0);
    const metadata: any = await this.tenancyContext.getTenantMetadata();

    return {
      ...map,
      turnover: {
        amount,
        formatted: formatNumber(amount, {
          currencyCode: metadata?.baseCurrency ?? 'RUB',
          money: true,
        }),
      },
    };
  }
}
