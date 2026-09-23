// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import {
  ArticlesCashflowRollupService,
  CashRollupLeg,
  legDate,
  periodIndexOf,
} from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { Contact } from '@/modules/Contacts/models/Contact';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { readOrganizationCalendar } from '@/modules/Settings/organizationCalendar';
import { Project } from '@/modules/Projects/models/Project.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { applyManagementReportScope } from '@/modules/ManagementArticles/utils/managementReportScope';
import {
  CASH_ACCOUNT_TYPES,
  TRANSFER_TYPES,
} from '@/modules/Budgets/constants';

import { buildCashFlowArticlesMatrix } from './cashFlowArticlesMatrix';
import { buildCashFlowArticlesReport } from './buildCashFlowArticlesReport';
import {
  CashFlowGrouping,
  CashGroupNode,
  GroupingContext,
  groupingRows,
} from './groupings';
import {
  ICashFlowArticlesData,
  ICashFlowArticlesQuery,
  ICashFlowArticlesSheet,
} from './CashFlowArticles.types';
import {
  buildReportPeriods,
  CashFlowDateGroup,
  PERIOD_TOO_WIDE_FOR_GRANULARITY,
  PeriodTooWideError,
  ReportPeriod,
} from './periodizeRows';
import { CashFlowArticlesMeta } from './CashFlowArticlesMeta';

/** Движение по денежным счетам за один период. */
interface CashMoves {
  net: number;
  transfers: { incoming: number; outgoing: number };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

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

    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,

    @Inject(Project.name)
    private readonly projectModel: TenantModelProxy<typeof Project>,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => Promise<SettingsStore>,
  ) {}

  /**
   * Собирает отчёт о движении денег по статьям — матрицей «статьи × периоды»
   * (FT-001 ТЗ-3).
   *
   * ОСТАТКИ ЦЕПЛЯЮТСЯ, А НЕ СЧИТАЮТСЯ ЗАНОВО НА КАЖДУЮ КОЛОНКУ. Остаток на
   * начало берётся один раз из базы, дальше конец колонки = начало + поток
   * по денежным счетам, а начало следующей = конец предыдущей. Так цепочка
   * не рвётся по построению. Остаток на конец всего отрезка при этом
   * считается ОТДЕЛЬНЫМ запросом и сверяется с концом цепочки: сошлось —
   * `isBalanced`, нет — это видно, а не спрятано.
   *
   * @param {ICashFlowArticlesQuery} query
   * @returns {Promise<ICashFlowArticlesSheet>}
   */
  public async sheet(
    query: ICashFlowArticlesQuery,
  ): Promise<ICashFlowArticlesSheet> {
    const group = query.group ?? 'articles';
    const dateGroup = query.dateGroup ?? 'month';
    // Неделя начинается с дня из календаря организации (FT-006b).
    const { weekStartDay } = readOrganizationCalendar(
      await this.settingsStore(),
    );
    const periods = this.periodsOf(query, dateGroup, weekStartDay);
    const cashAccountIds = await this.getCashAccountIds();

    const [periodLegs, openingBalance, closingBalance, cashMoves] =
      await Promise.all([
        periods.length
          ? this.rollup.loadByPeriods(query as any, periods)
          : Promise.resolve(null),
        this.cashBalanceBefore(cashAccountIds, query),
        this.cashBalanceThrough(cashAccountIds, query),
        this.cashMovesByPeriods(cashAccountIds, query, periods),
      ]);

    const rowsByPeriod = periodLegs
      ? await this.groupRowsByPeriod(group, periodLegs)
      : [];

    let opening = openingBalance;
    const matrix = buildCashFlowArticlesMatrix({
      group,
      dateGroup,
      periods: periods.map((period, index) => {
        const moves = cashMoves[index];
        const periodOpening = opening;
        const periodClosing = round2(periodOpening + moves.net);
        opening = periodClosing;

        return {
          ...period,
          rows: rowsByPeriod[index] ?? [],
          openingBalance: periodOpening,
          closingBalance: periodClosing,
          transfers: moves.transfers,
        };
      }),
    });

    // Независимая сверка: конец цепочки против остатка из базы на дату конца.
    const chainClosing = matrix.total.closingBalance;
    const isBalanced =
      matrix.total.isBalanced &&
      matrix.isChained &&
      Math.abs(chainClosing - round2(closingBalance)) < 0.005;

    const data: ICashFlowArticlesData = {
      ...matrix.total,
      isBalanced,
      group,
      dateGroup,
      isChained: matrix.isChained,
      periods: matrix.periods,
    };

    const meta = await this.cashFlowArticlesMeta.meta(query);

    return { data, query, meta };
  }

  /**
   * Периоды отчёта. Слишком мелкий масштаб на длинном отрезке — понятная
   * ошибка 400 с кодом, а не простыня на тысячу колонок.
   */
  private periodsOf(
    query: ICashFlowArticlesQuery,
    dateGroup: CashFlowDateGroup,
    weekStartDay: number,
  ): ReportPeriod[] {
    try {
      return buildReportPeriods(
        query.fromDate,
        query.toDate,
        dateGroup,
        weekStartDay,
      );
    } catch (error) {
      if (error instanceof PeriodTooWideError) {
        throw new ServiceError(
          PERIOD_TOO_WIDE_FOR_GRANULARITY,
          error.message,
          { periodsCount: error.periodsCount },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /**
   * Строки каждой колонки в выбранной группировке (FT-002 ТЗ-3).
   *
   * Все группировки работают с ОДНИМИ И ТЕМИ ЖЕ ногами и одним признаком
   * «оплачено деньгами» — иначе «Чистый поток» разошёлся бы между вкладками.
   */
  private async groupRowsByPeriod(
    group: CashFlowGrouping,
    periodLegs: Awaited<ReturnType<ArticlesCashflowRollupService['loadByPeriods']>>,
  ): Promise<CashGroupNode[][]> {
    const { loaded, settledKeys, buckets } = periodLegs;

    // Список статей — из свёртки пустого набора ног: там все статьи с нулями.
    const articles = (
      this.rollup.foldLegs(loaded, [], settledKeys) as any[]
    ).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      parentId: row.parentId ?? null,
      cashflowSection: row.cashflowSection ?? null,
      sortOrder: row.sortOrder,
    }));

    const foldToReport = (legs: CashRollupLeg[]) =>
      buildCashFlowArticlesReport({
        articles,
        amounts: (this.rollup.foldLegs(loaded, legs, settledKeys) as any[]).map(
          (row) => ({ id: row.id, amount: Number(row.amount ?? 0) }),
        ),
        openingBalance: 0,
        closingBalance: 0,
      });

    const names = await this.namesFor(group, loaded.legs);

    return buckets.map((legs) =>
      groupingRows(group, {
        report: foldToReport(legs),
        legs,
        settledKeys,
        isCashAccount: loaded.isCashAccount,
        foldToReport,
        names,
      }),
    );
  }

  /** Названия контрагентов, счетов и направлений — только нужной вкладке. */
  private async namesFor(
    group: CashFlowGrouping,
    legs: CashRollupLeg[],
  ): Promise<GroupingContext['names']> {
    const names: GroupingContext['names'] = {
      contacts: new Map(),
      accounts: new Map(),
      projects: new Map(),
    };
    const idsOf = (pick: (leg: CashRollupLeg) => number | null | undefined) => [
      ...new Set(
        legs
          .map(pick)
          .filter((id): id is number => id !== null && id !== undefined),
      ),
    ];

    if (group === 'contacts') {
      const ids = idsOf((leg) => leg.contactId);
      const rows = ids.length
        ? await this.contactModel().query().whereIn('id', ids).select(['id', 'displayName'])
        : [];
      (rows as any[]).forEach((row) => names.contacts.set(row.id, row.displayName));
    }
    if (group === 'accounts') {
      const ids = idsOf((leg) => leg.accountId);
      const rows = ids.length
        ? await this.accountModel().query().whereIn('id', ids).select(['id', 'name'])
        : [];
      (rows as any[]).forEach((row) => names.accounts.set(row.id, row.name));
    }
    if (group === 'directions' || group === 'directions_articles') {
      const ids = idsOf((leg) => leg.projectId);
      const rows = ids.length
        ? await this.projectModel().query().whereIn('id', ids).select(['id', 'name'])
        : [];
      (rows as any[]).forEach((row) => names.projects.set(row.id, row.name));
    }
    return names;
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
   * Движение по денежным счетам по периодам: чистый поток и переводы между
   * своими счетами — ОДНИМ запросом на весь отрезок.
   *
   * Чистый поток нужен для цепочки остатков. Переводы показываются отдельным
   * блоком и в потоки статей не входят: перевод со своего счёта на свой денег
   * бизнесу не прибавляет. Итог блока по определению ноль — ненулевой
   * означает поломку данных и потому виден.
   */
  private async cashMovesByPeriods(
    cashAccountIds: Set<number>,
    query: ICashFlowArticlesQuery,
    periods: ReportPeriod[],
  ): Promise<CashMoves[]> {
    const moves: CashMoves[] = periods.map(() => ({
      net: 0,
      transfers: { incoming: 0, outgoing: 0 },
    }));
    if (cashAccountIds.size === 0 || periods.length === 0) return moves;

    const legs = await this.accountTransactionModel()
      .query()
      .onBuild((qb: any) => {
        qb.whereIn('accountId', [...cashAccountIds]);
        qb.modify(
          'filterDateRange',
          periods[0].fromDate,
          periods[periods.length - 1].toDate,
        );
        applyManagementReportScope(qb, query as any);
      });

    (legs as any[]).forEach((leg: any) => {
      const index = periodIndexOf(periods, legDate(leg));
      if (index < 0) return;

      const debit = Number(leg.debit ?? 0);
      const credit = Number(leg.credit ?? 0);
      const move = moves[index];

      move.net += debit - credit;
      if ((TRANSFER_TYPES as readonly string[]).includes(leg.transactionType)) {
        move.transfers.incoming += debit;
        move.transfers.outgoing += credit;
      }
    });

    return moves.map((move) => ({
      net: round2(move.net),
      transfers: {
        incoming: round2(move.transfers.incoming),
        outgoing: round2(move.transfers.outgoing),
      },
    }));
  }
}
