// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import {
  ArticlesCashflowRollupService,
  legDate,
  periodIndexOf,
} from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { accountNet } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { applyManagementReportScope } from '@/modules/ManagementArticles/utils/managementReportScope';
import { PL_ARTICLE_KINDS } from '@/modules/ManagementArticles/constants';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { ReportPeriod } from '../CashFlowArticles/periodizeRows';
import { PaymentReceivedEntry } from '@/modules/PaymentReceived/models/PaymentReceivedEntry';
import { BillPaymentEntry } from '@/modules/BillPayments/models/BillPaymentEntry';
import {
  recognizeSettlementLegs,
  settlementDepsFromModels,
} from '../ProfitLossSheet/settlementRecognition';

/**
 * Суммы для управленческого ОПиУ (FT-010 ТЗ-3) — по периодам, статьям и
 * направлениям, ОДНИМ проходом на весь отрезок.
 *
 * ДВА МЕТОДА УЧЁТА — ОДИН ОТВЕТ. По начислению сумма статьи — это оборот её
 * счетов, как в бухгалтерском ОПиУ. По деньгам — только документы, прошедшие
 * деньгами, тем же признаком, что у отчёта «Деньги». Дальше отчёт строится
 * одинаково, и метод меняет только числа, а не устройство.
 *
 * СУММЫ — СОБСТВЕННЫЕ, без подъёма в родителя. Ярус складывается из статей
 * своего яруса; подними мы суммы детей в родителя, ребёнок с другим ярусом
 * попал бы в ярус родителя дважды — своим и родительским.
 *
 * СЧЕТА БЕЗ СТАТЬИ НЕ ТЕРЯЮТСЯ. Доходный или расходный счёт, не привязанный
 * ни к одной статье, попадает в «Не отнесено к ярусу» — иначе его сумма
 * пропала бы из отчёта молча, и прибыль разошлась бы с бухгалтерской.
 */

export type PnlBasis = 'accrual' | 'cash';

export interface PnlEntry {
  /** Статья; `null` — счёт доходов или расходов без статьи. */
  articleId: number | null;
  accountId: number;
  projectId: number | null;
  /**
   * У статьи — «положительная величина» (доход и расход оба со знаком плюс,
   * как в свёртке ОПиУ); у счёта без статьи — влияние на прибыль со знаком.
   */
  amount: number;
}

export interface PnlSource {
  articles: any[];
  /** Счета: имя, сторона, тип — для строк «счёт без статьи». */
  accountsById: Map<number, { name: string; accountNormal: string; accountType: string }>;
  entriesByPeriod: PnlEntry[][];
}

/** Счета отчёта о прибыли: доходы и расходы. Касса и расчёты сюда не идут. */
const PL_ACCOUNT_TYPES = new Set<string>([
  ACCOUNT_TYPE.INCOME,
  ACCOUNT_TYPE.OTHER_INCOME,
  ACCOUNT_TYPE.COST_OF_GOODS_SOLD,
  ACCOUNT_TYPE.EXPENSE,
  ACCOUNT_TYPE.OTHER_EXPENSE,
]);

@Injectable()
export class ManagerialPnlSourceService {
  constructor(
    private readonly cashRollup: ArticlesCashflowRollupService,

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

    @Inject(PaymentReceivedEntry.name)
    private readonly paymentReceivedEntryModel: TenantModelProxy<
      typeof PaymentReceivedEntry
    >,

    @Inject(BillPaymentEntry.name)
    private readonly billPaymentEntryModel: TenantModelProxy<
      typeof BillPaymentEntry
    >,
  ) {}

  public async load(
    query: any,
    periods: ReportPeriod[],
    basis: PnlBasis,
  ): Promise<PnlSource> {
    const articles = await this.articleModel()
      .query()
      .whereIn('kind', PL_ARTICLE_KINDS as unknown as string[])
      .orderBy('sortOrder');
    const map: any[] = await this.articleAccountModel().query();
    const articleIds = new Set<number>((articles as any[]).map((a) => a.id));
    const articleOfAccount = new Map<number, number>();
    map.forEach((m) => {
      // Счёт, привязанный к балансовой статье, в ОПиУ не идёт.
      if (articleIds.has(m.articleId)) articleOfAccount.set(m.accountId, m.articleId);
    });

    const accountRows: any[] = await this.accountModel().query();
    const accountsById = new Map<
      number,
      { name: string; accountNormal: string; accountType: string }
    >();
    accountRows.forEach((a) =>
      accountsById.set(a.id, {
        name: a.name,
        accountNormal: a.accountNormal,
        accountType: a.accountType,
      }),
    );

    const entriesByPeriod: PnlEntry[][] = periods.map(() => []);
    if (periods.length === 0) {
      return { articles: articles as any[], accountsById, entriesByPeriod };
    }

    const push = (
      index: number,
      accountId: number,
      projectId: number | null,
      credit: number,
      debit: number,
    ) => {
      const account = accountsById.get(accountId);
      const net = accountNet(credit, debit, account?.accountNormal);
      if (!net) return;

      const articleId = articleOfAccount.get(accountId);
      if (articleId !== undefined) {
        entriesByPeriod[index].push({ articleId, accountId, projectId, amount: net });
        return;
      }
      if (!account || !PL_ACCOUNT_TYPES.has(account.accountType)) return;
      // Счёт без статьи: влияние на прибыль со знаком.
      entriesByPeriod[index].push({
        articleId: null,
        accountId,
        projectId,
        amount: account.accountNormal === 'credit' ? net : -net,
      });
    };

    if (basis === 'cash') {
      const { loaded, settledKeys, buckets } = await this.cashRollup.loadByPeriods(
        query,
        periods,
      );
      buckets.forEach((legs, index) =>
        legs.forEach((leg) => {
          if (!settledKeys.has(`${leg.referenceType}:${leg.referenceId}`)) return;
          if (loaded.isCashAccount(leg.accountId)) return;
          push(
            index,
            leg.accountId,
            leg.projectId ?? null,
            Number(leg.credit || 0),
            Number(leg.debit || 0),
          );
        }),
      );

      // Счёт, оплаченный позже отдельной оплатой, сам денег не касается, а
      // оплата ходит только по балансовым счетам. Доход и расход таких
      // счетов признаются по факту платежа — тем же правилом, что в
      // бухгалтерском ОПиУ по деньгам (иначе два отчёта «по деньгам»
      // разошлись бы в выручке; найдено живой проверкой этапа 32).
      const settledLegs = loaded.allLegs.filter((leg) =>
        settledKeys.has(`${leg.referenceType}:${leg.referenceId}`),
      );
      const recognized = await recognizeSettlementLegs(
        settledLegs as any,
        settlementDepsFromModels({
          accounts: accountRows,
          accountTransactionModel: this.accountTransactionModel,
          paymentReceivedEntryModel: this.paymentReceivedEntryModel,
          billPaymentEntryModel: this.billPaymentEntryModel,
        }),
      );
      recognized.forEach((leg) => {
        const index = periodIndexOf(periods, legDate(leg as any));
        if (index < 0) return;
        push(
          index,
          leg.accountId,
          null,
          Number(leg.credit || 0),
          Number(leg.debit || 0),
        );
      });
      return { articles: articles as any[], accountsById, entriesByPeriod };
    }

    // По начислению: оборот счетов, сгруппированный по счёту, направлению и
    // дню, — один запрос на весь отрезок, раскладка по колонкам в памяти.
    const rows: any[] = await this.accountTransactionModel()
      .query()
      .onBuild((qb: any) => {
        qb.select(['accountId', 'projectId', 'date']);
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy(['accountId', 'projectId', 'date']);
        qb.modify(
          'filterDateRange',
          periods[0].fromDate,
          periods[periods.length - 1].toDate,
        );
        // Подразделения, юрлица, направления — одним общим местом (FT-008).
        applyManagementReportScope(qb, query);
      });

    rows.forEach((row) => {
      const index = periodIndexOf(periods, legDate(row));
      if (index < 0) return;
      push(
        index,
        row.accountId,
        row.projectId ?? null,
        Number(row.credit || 0),
        Number(row.debit || 0),
      );
    });

    return { articles: articles as any[], accountsById, entriesByPeriod };
  }
}
