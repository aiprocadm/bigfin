import { Inject, Injectable } from '@nestjs/common';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { ArticlesRollupQueryDto } from '../dtos/ArticlesRollupQuery.dto';
import { PL_ARTICLE_KINDS } from '../constants';
import { applyManagementReportScope } from '../utils/managementReportScope';

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

/** Сколько денег прошло мимо статей. */
export interface UnmappedTotals {
  /** Доходы по счетам, не привязанным ни к одной статье. */
  income: number;
  /** Расходы по счетам, не привязанным ни к одной статье. */
  expense: number;
  /** Сколько таких счетов — чтобы человек понимал объём работы. */
  accountsCount: number;
}

/**
 * Деньги, прошедшие МИМО статей (Р4 этапа 9).
 *
 * ЗАЧЕМ ЭТО ЕСТЬ. `foldAccountsIntoArticles` молча пропускает счёт, который
 * не привязан ни к одной статье. Это не то же самое, что статья «Не
 * размечено»: ту хотя бы видно. Здесь же сумма просто НЕ ПОПАДАЕТ в отчёт —
 * итог оказывается меньше, чем в ОПиУ, и ничто на это не указывает. Человек
 * замечает расхождение через месяц и не знает, где искать.
 *
 * Считаем отдельно, а не строкой в свёртке, НАМЕРЕННО. Свёртку зовут два
 * десятка мест: безубыточность, рентабельность сделок, распределение
 * накладных. Подмешать туда искусственную строку значило бы тихо изменить
 * все эти расчёты — то есть лечить тишину новой тишиной. Здесь пробел
 * возвращается ОТДЕЛЬНЫМ полем, и экран показывает его прямо.
 *
 * Доходы и расходы разведены: «не разнесено 300 000» без знака непонятно —
 * это недосчитанная выручка или недосчитанные траты.
 */
export function unmappedAccountsTotals(
  map: { accountId: number; articleId: number }[],
  accountNets: { accountId: number; net: number }[],
  normalByAccountId: Map<number, string>,
): UnmappedTotals {
  const mapped = new Set<number>(map.map((m) => m.accountId));

  let income = 0;
  let expense = 0;
  let accountsCount = 0;

  accountNets.forEach(({ accountId, net }) => {
    if (mapped.has(accountId)) return;
    // Счёт без движения за период не «пробел», а просто тишина: показывать
    // его человеку не о чем.
    if (!net) return;

    accountsCount += 1;

    if (normalByAccountId.get(accountId) === 'credit') {
      income += net;
    } else {
      expense += net;
    }
  });

  return { income, expense, accountsCount };
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
    const { folded } = await this.buildFolded(query);
    return rollupAmountsToAncestors(folded);
  }

  /**
   * Свёртка ВМЕСТЕ с тем, что прошло мимо статей.
   *
   * Отдельный метод, а не изменение `getRollup`: два десятка мест зовут
   * свёртку ради расчётов, и добавлять им в ответ лишнее поле незачем.
   * Экран анализа расходов зовёт этот.
   */
  public async getRollupWithUnmapped(query: ArticlesRollupQueryDto): Promise<{
    rows: ArticleRollupRow[];
    unmapped: UnmappedTotals;
  }> {
    const { folded, unmapped } = await this.buildFolded(query);

    return { rows: rollupAmountsToAncestors(folded), unmapped };
  }

  /**
   * Same fold as getRollup but WITHOUT rolling amounts up to ancestors: every
   * row's `amount` is its OWN directly-mapped net only (disjoint across
   * articles). Summing any subset of these rows never double-counts a
   * parent+child — used by break-even to total only the fixed-flagged articles.
   * @param {ArticlesRollupQueryDto} query
   * @returns {Promise<ArticleRollupRow[]>}
   */
  public async getOwnAmounts(query: ArticlesRollupQueryDto) {
    const { folded } = await this.buildFolded(query);
    return folded;
  }

  private async buildFolded(query: ArticlesRollupQueryDto): Promise<{
    folded: ArticleRollupRow[];
    unmapped: UnmappedTotals;
  }> {
    // ТОЛЬКО ДОХОДЫ И РАСХОДЫ (правило 1 FIN-001 ТЗ-2).
    //
    // С этапа 17 статья бывает пяти видов, и три из них — балансовые:
    // активы, обязательства, капитал. Взнос учредителя не выручка, покупка
    // станка не расход, погашение кредита не убыток. Попади они сюда —
    // поехали бы разом ПЯТЬ расчётов, которые зовут эту свёртку: точка
    // безубыточности, рентабельность сделок, распределение накладных,
    // капитализация и ответы ИИ-аналитика. Причём поехали бы ТИХО: строки
    // выглядели бы как обычные статьи, а прибыль стала бы другой.
    //
    // Отбор стоит здесь, в одном месте сборки, а не у каждого потребителя:
    // потребитель, который о нём не знает, — это ошибка, которая ждёт
    // своего дня.
    const articles = await this.articleModel()
      .query()
      .whereIn('kind', PL_ARTICLE_KINDS as unknown as string[])
      .orderBy('sortOrder');
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
        // Подразделения, юрлица, направления — одним общим местом (FT-008).
        applyManagementReportScope(qb, query);
        if (query.projectId) {
          qb.modify('filterByProjects', [query.projectId]);
        }
        if (query.unassignedProject) {
          qb.whereNull('projectId'); // overhead not tied to any deal
        }
      });

    // Вид счёта (приходный/расходный) нужен ВСЕМ счетам с движением, а не
    // только привязанным к статьям: по нему же разделяются доходы и расходы
    // в том, что прошло мимо статей.
    const accountIdsWithMovement = accountTotals.map((row: any) => row.accountId);
    const accounts = accountIdsWithMovement.length
      ? await this.accountModel().query().whereIn('id', accountIdsWithMovement)
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

    return {
      folded: foldAccountsIntoArticles(articles, map, accountNets),
      unmapped: unmappedAccountsTotals(map, accountNets, normalByAccountId),
    };
  }
}
