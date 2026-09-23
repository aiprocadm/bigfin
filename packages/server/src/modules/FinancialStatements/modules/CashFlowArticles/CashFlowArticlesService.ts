// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ArticlesCashflowRollupService } from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { applyManagementReportScope } from '@/modules/ManagementArticles/utils/managementReportScope';
import {
  CASH_ACCOUNT_TYPES,
  TRANSFER_TYPES,
} from '@/modules/Budgets/constants';

import { buildCashFlowArticlesReport } from './buildCashFlowArticlesReport';
import {
  ICashFlowArticlesQuery,
  ICashFlowArticlesSheet,
} from './CashFlowArticles.types';
import { CashFlowArticlesMeta } from './CashFlowArticlesMeta';

/**
 * Отчёт «Деньги (ДДС по статьям)» — сбор данных (FIN-013 ТЗ-2).
 *
 * РАСЧЁТ НЕ ДУБЛИРУЕТСЯ. Разбивка по статьям берётся у
 * `ArticlesCashflowRollupService` — того самого, что питает график на
 * главной и план-факт бюджета. Именно поэтому график и таблица наконец
 * показывают одно и то же: считает их один код.
 *
 * ОСТАТКИ БЕРУТСЯ С ДЕНЕЖНОЙ СТОРОНЫ, а не складыванием статей. Счёт, не
 * привязанный ни к одной статье, в разбивку не попадёт, и сумма статей может
 * оказаться меньше настоящего движения. Считай мы поток статьями — равенство
 * «начало + поток = конец» разошлось бы по вине отчёта. Разница показывается
 * строкой «не разнесено».
 */
@Injectable()
export class CashFlowArticlesService {
  constructor(
    private readonly rollup: ArticlesCashflowRollupService,
    private readonly cashFlowArticlesMeta: CashFlowArticlesMeta,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * Собирает отчёт о движении денег по статьям.
   * @param {ICashFlowArticlesQuery} query
   * @returns {Promise<ICashFlowArticlesSheet>}
   */
  public async sheet(
    query: ICashFlowArticlesQuery,
  ): Promise<ICashFlowArticlesSheet> {
    const cashAccountIds = await this.getCashAccountIds();

    const [rollupRows, openingBalance, closingBalance, transfers] =
      await Promise.all([
        this.rollup.getRollup(query as any),
        this.cashBalanceBefore(cashAccountIds, query),
        this.cashBalanceThrough(cashAccountIds, query),
        this.transfersTotals(cashAccountIds, query),
      ]);

    const data = buildCashFlowArticlesReport({
      articles: (rollupRows as any[]).map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        parentId: row.parentId ?? null,
        cashflowSection: row.cashflowSection ?? null,
        sortOrder: row.sortOrder,
      })),
      amounts: (rollupRows as any[]).map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
      })),
      openingBalance,
      closingBalance,
      transfers,
    });

    const meta = await this.cashFlowArticlesMeta.meta(query);

    return { data, query, meta };
  }

  /** Денежные счета организации: касса, банк, личные средства. */
  private async getCashAccountIds(): Promise<Set<number>> {
    const accounts = await this.accountModel()
      .query()
      .whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);

    return new Set<number>((accounts as any[]).map((a: any) => a.id));
  }

  /**
   * Остаток денег НА НАЧАЛО периода — то есть по все дни ДО первого.
   *
   * Отдельным запросом, а не вычитанием из конечного: так «начало» и «конец»
   * считаются одинаково, и ошибка в одном не компенсирует ошибку в другом.
   */
  private cashBalanceBefore(
    cashAccountIds: Set<number>,
    query: ICashFlowArticlesQuery,
  ): Promise<number> {
    return this.cashBalance(cashAccountIds, query, (qb) => {
      qb.where('date', '<', query.fromDate);
    });
  }

  /** Остаток денег на конец периода: всё по последний день включительно. */
  private cashBalanceThrough(
    cashAccountIds: Set<number>,
    query: ICashFlowArticlesQuery,
  ): Promise<number> {
    return this.cashBalance(cashAccountIds, query, (qb) => {
      qb.where('date', '<=', query.toDate);
    });
  }

  /**
   * Денежные счета дебетовые: остаток равен дебету минус кредит.
   *
   * Остаток идёт через тот же отбор, что и разбивка по статьям (FT-008). Иначе
   * при выбранном юрлице статьи считались бы по нему, а остатки — по всей
   * группе, и строка «не разнесено» проглотила бы чужие деньги как свои.
   */
  private async cashBalance(
    cashAccountIds: Set<number>,
    query: ICashFlowArticlesQuery,
    applyDate: (qb: any) => void,
  ): Promise<number> {
    if (cashAccountIds.size === 0) return 0;

    const rows = await this.accountTransactionModel()
      .query()
      .onBuild((qb: any) => {
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.whereIn('accountId', [...cashAccountIds]);
        applyDate(qb);
        applyManagementReportScope(qb, query as any);
      });

    const row: any = (rows as any[])[0] ?? {};

    return Number(row.debit ?? 0) - Number(row.credit ?? 0);
  }

  /**
   * Переводы между своими счетами за период.
   *
   * Показываются отдельным блоком и в потоки не входят: перевод со своего
   * счёта на свой денег бизнесу не прибавляет. Итог блока по определению
   * ноль — ненулевой означает поломку данных и потому виден.
   */
  private async transfersTotals(
    cashAccountIds: Set<number>,
    query: ICashFlowArticlesQuery,
  ): Promise<{ incoming: number; outgoing: number }> {
    if (cashAccountIds.size === 0) return { incoming: 0, outgoing: 0 };

    const legs = await this.accountTransactionModel()
      .query()
      .onBuild((qb: any) => {
        qb.whereIn('accountId', [...cashAccountIds]);
        qb.whereIn(
          'transactionType',
          TRANSFER_TYPES as unknown as string[],
        );
        qb.modify('filterDateRange', query.fromDate, query.toDate);
        applyManagementReportScope(qb, query as any);
      });

    let incoming = 0;
    let outgoing = 0;

    (legs as any[]).forEach((leg: any) => {
      incoming += Number(leg.debit ?? 0);
      outgoing += Number(leg.credit ?? 0);
    });

    return { incoming, outgoing };
  }
}
