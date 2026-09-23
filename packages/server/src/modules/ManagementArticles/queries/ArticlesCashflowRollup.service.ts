import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
// Чистые функции свёртки берутся у соседа по модулю — расчёт ОПиУ и расчёт
// ДДС складывают статьи одинаково, и складывать их дважды значит завести
// второй источник правды.
import {
  foldAccountsIntoArticles,
  rollupAmountsToAncestors,
  accountNet,
} from './ArticlesPlRollup.service';
import { ArticlesRollupQueryDto } from '../dtos/ArticlesRollupQuery.dto';
import { applyManagementReportScope } from '../utils/managementReportScope';
// Признак «оплачено деньгами» и список денежных счетов остаются в бюджетах:
// там они появились (§8.2 ТЗ-1) и оттуда же их читают отчёты. Дублировать
// список денежных счетов в третий раз — верный способ развести определения.
import { cashSettledReferenceKeys } from '@/modules/Budgets/utils/cashSettledReferenceKeys';
import { CASH_ACCOUNT_TYPES } from '@/modules/Budgets/constants';

/** Нога проводки в том виде, в каком её читает свёртка. */
export interface CashRollupLeg {
  referenceType: string;
  referenceId: number;
  accountId: number;
  debit: number | string | null;
  credit: number | string | null;
  date?: Date | string | null;
  transactionType?: string | null;
  /** Контрагент и направление — для группировок отчёта «Деньги» (FT-002). */
  contactId?: number | null;
  projectId?: number | null;
}

/** Период, на который раскладывается свёртка. */
export interface CashRollupPeriod {
  fromDate: string;
  toDate: string;
}

/**
 * Обороты счетов, привязанных к статьям, — только по кассово-расчётным
 * документам (FIN-013 ТЗ-2).
 *
 * Чистая функция: вход — уже загруженные ноги, выход — «счёт → сумма».
 * Отдельно от службы, чтобы одинаково считать и весь отрезок, и каждый
 * период матрицы.
 */
export function cashNetsByAccount(
  legs: CashRollupLeg[],
  settledKeys: Set<string>,
  mappedAccountIds: Set<number>,
  normalByAccountId: Map<number, string>,
): { accountId: number; net: number }[] {
  const totals = new Map<number, { credit: number; debit: number }>();

  legs.forEach((leg) => {
    if (!settledKeys.has(`${leg.referenceType}:${leg.referenceId}`)) return;
    if (!mappedAccountIds.has(leg.accountId)) return;

    const current = totals.get(leg.accountId) || { credit: 0, debit: 0 };
    current.credit += Number(leg.credit || 0);
    current.debit += Number(leg.debit || 0);
    totals.set(leg.accountId, current);
  });

  return Array.from(totals.entries()).map(([accountId, total]) => ({
    accountId,
    net: accountNet(total.credit, total.debit, normalByAccountId.get(accountId)),
  }));
}

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

/**
 * Дата ноги строкой `ГГГГ-ММ-ДД` — база отдаёт её объектом даты.
 *
 * Без библиотеки дат: функция зовётся на каждую ногу отчёта, а на 50 000
 * операций разбор через moment съедал заметную долю из трёх секунд,
 * отведённых отчёту (FT-001). Дата читается в местном времени — так же, как
 * её отдаёт драйвер базы, поэтому граница месяца не сдвигается.
 */
export function legDate(leg: { date?: Date | string | null }): string | null {
  if (!leg.date) return null;
  if (typeof leg.date === 'string') return leg.date.slice(0, 10);
  if (!(leg.date instanceof Date) || Number.isNaN(leg.date.getTime())) {
    return null;
  }

  const date = leg.date;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Номер периода, в который попадает дата; `-1` — ни в один.
 *
 * Периоды идут подряд и не пересекаются (так их строит нарезка отчёта),
 * поэтому хватает двоичного поиска по началу периода.
 */
export function periodIndexOf(
  periods: CashRollupPeriod[],
  date: string | null,
): number {
  if (!date) return -1;

  let low = 0;
  let high = periods.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const period = periods[middle];

    if (date < period.fromDate) high = middle - 1;
    else if (date > period.toDate) low = middle + 1;
    else return middle;
  }
  return -1;
}

export interface LoadedRollup {
  articles: any[];
  map: any[];
  /** Ноги, которые складываются в суммы: с учётом отбора по направлениям. */
  legs: CashRollupLeg[];
  /**
   * ВСЕ ноги отрезка — только для признака «оплачено деньгами».
   *
   * Направление стоит на ноге статьи, а на денежной ноге его обычно нет.
   * Отбери мы ноги по направлению ДО признака — денежная нога отпала бы, и
   * документ, честно оплаченный деньгами, перестал бы им считаться.
   */
  allLegs: CashRollupLeg[];
  isCashAccount: (id: number) => boolean;
  mappedAccountIds: Set<number>;
  normalByAccountId: Map<number, string>;
}

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
   * Кассовый факт, свёрнутый по статьям учёта: та же свёртка, что у ОПиУ, но
   * только по тем проводкам, которые и правда прошли деньгами — документ
   * задел денежный счёт и не является переводом между своими счетами.
   * @param {ArticlesRollupQueryDto} query
   */
  public async getRollup(query: ArticlesRollupQueryDto) {
    const loaded = await this.load(query);
    const settledKeys = cashSettledReferenceKeys(
      loaded.allLegs as any,
      loaded.isCashAccount,
    );

    return this.foldLegs(loaded, loaded.legs, settledKeys);
  }

  /**
   * Та же свёртка, разложенная по периодам (FT-001 ТЗ-3) — ЗА ОДИН ПРОХОД.
   *
   * Звать `getRollup` на каждый период значило бы пять запросов на колонку:
   * год по месяцам — шестьдесят запросов на одну страницу. Здесь ноги
   * читаются один раз за весь отрезок и раскладываются по периодам в памяти.
   *
   * ПРИЗНАК «ОПЛАЧЕНО ДЕНЬГАМИ» СЧИТАЕТСЯ ОДИН РАЗ, по всему отрезку. Тогда
   * сумма колонок равна итогу за весь отрезок при ЛЮБОМ масштабе: признак
   * документа не зависит от того, на какие колонки нарезали период.
   *
   * @param query - отбор отчёта (даты берутся из периодов)
   * @param periods - идущие подряд периоды
   */
  public async getRollupByPeriods(
    query: ArticlesRollupQueryDto,
    periods: CashRollupPeriod[],
  ): Promise<Array<CashRollupPeriod & { rows: any[] }>> {
    if (periods.length === 0) return [];

    const { loaded, settledKeys, buckets } = await this.loadByPeriods(
      query,
      periods,
    );

    return periods.map((period, index) => ({
      ...period,
      rows: this.foldLegs(loaded, buckets[index], settledKeys),
    }));
  }

  /**
   * Ноги отрезка, разложенные по периодам, и признак «оплачено деньгами» —
   * сырьё для свёртки по статьям и для других группировок отчёта «Деньги»
   * (FT-002 ТЗ-3: контрагенты, счета, направления).
   *
   * Отдаётся наружу, чтобы группировки не читали ноги второй раз: другой
   * запрос — другой отбор, и «Чистый поток» разошёлся бы между вкладками.
   */
  public async loadByPeriods(
    query: ArticlesRollupQueryDto,
    periods: CashRollupPeriod[],
  ): Promise<{
    loaded: LoadedRollup;
    settledKeys: Set<string>;
    buckets: CashRollupLeg[][];
  }> {
    const loaded = await this.load({
      ...query,
      fromDate: periods[0]?.fromDate,
      toDate: periods[periods.length - 1]?.toDate,
    } as ArticlesRollupQueryDto);

    const settledKeys = cashSettledReferenceKeys(
      loaded.allLegs as any,
      loaded.isCashAccount,
    );

    const buckets: CashRollupLeg[][] = periods.map(() => []);
    loaded.legs.forEach((leg) => {
      const index = periodIndexOf(periods, legDate(leg));
      if (index >= 0) buckets[index].push(leg);
    });

    return { loaded, settledKeys, buckets };
  }

  /** Статьи, карта счетов, денежные счета и ноги отрезка — один раз. */
  private async load(query: ArticlesRollupQueryDto): Promise<LoadedRollup> {
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

    // Все проводки отрезка (для отбора кассово-расчётных reference).
    const legs = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        if (query.fromDate || query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
        // Подразделения и юрлица — одним общим местом (FT-008). Отбор стоит
        // ДО определения «оплачено деньгами»: признак считается по ногам
        // выбранного юрлица, как в бухгалтерском ДДС. Направления — ниже,
        // в памяти: см. `allLegs`.
        applyManagementReportScope(qb, { ...query, projectsIds: undefined });
      });

    const projectIds = new Set<number>((query.projectsIds ?? []).map(Number));
    const scopedLegs = projectIds.size
      ? (legs as any[]).filter((leg) => projectIds.has(Number(leg.projectId)))
      : (legs as any[]);

    const mappedAccountIds = new Set<number>(
      (map as any[]).map((m: any) => m.accountId),
    );
    const accounts = mappedAccountIds.size
      ? await this.accountModel().query().whereIn('id', [...mappedAccountIds])
      : [];
    const normalByAccountId = new Map<number, string>();
    (accounts as any[]).forEach((a: any) =>
      normalByAccountId.set(a.id, a.accountNormal),
    );

    return {
      articles: articles as any[],
      map: map as any[],
      legs: scopedLegs,
      allLegs: legs as any[],
      isCashAccount: (id: number) => cashAccountIds.has(id),
      mappedAccountIds,
      normalByAccountId,
    };
  }

  /** Ноги → суммы статей с подъёмом в предков. */
  public foldLegs(
    loaded: LoadedRollup,
    legs: CashRollupLeg[],
    settledKeys: Set<string>,
  ) {
    const accountNets = cashNetsByAccount(
      legs,
      settledKeys,
      loaded.mappedAccountIds,
      loaded.normalByAccountId,
    );
    const folded = foldAccountsIntoArticles(
      loaded.articles,
      loaded.map,
      accountNets,
    );
    return rollupAmountsToAncestors(folded);
  }
}
