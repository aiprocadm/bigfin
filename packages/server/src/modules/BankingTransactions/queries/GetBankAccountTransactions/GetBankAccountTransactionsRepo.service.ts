import { Inject, Injectable, Scope } from '@nestjs/common';
import { ICashflowAccountTransactionsQuery } from '../../types/BankingTransactions.types';
import {
  groupMatchedBankTransactions,
  groupUncategorizedTransactions,
} from './_utils';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { UncategorizedBankTransaction } from '../../models/UncategorizedBankTransaction';
import { MatchedBankTransaction } from '@/modules/BankingMatching/models/MatchedBankTransaction';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';

@Injectable({ scope: Scope.REQUEST })
export class GetBankAccountTransactionsRepository {
  public query: ICashflowAccountTransactionsQuery;
  public transactions: any;
  public uncategorizedTransactions: any;
  public uncategorizedTransactionsMapByRef: Map<string, any>;
  public matchedBankTransactions: any;
  public matchedBankTransactionsMapByRef: Map<string, any>;
  public pagination: any;
  public openingBalance: any;

  /**
   * @param {TenantModelProxy<typeof AccountTransaction>} accountTransactionModel - Account transaction model.
   * @param {TenantModelProxy<typeof UncategorizedBankTransaction>} uncategorizedBankTransactionModel - Uncategorized transaction model
   * @param {TenantModelProxy<typeof MatchedBankTransaction>} matchedBankTransactionModel - Matched bank transaction model.
   */
  constructor(
    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedBankTransactionModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,

    @Inject(MatchedBankTransaction.name)
    private readonly matchedBankTransactionModel: TenantModelProxy<
      typeof MatchedBankTransaction
    >,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Счета статьи, по которой отбирают список (FIN-005 ТЗ-2).
   *
   * `null` — отбора по статье нет. Пустой список — статья есть, но счетов у
   * неё нет: тогда операций по ней быть не может, и это ОТВЕТ, а не повод
   * показать всё подряд.
   */
  private articleAccountIds: number[] | null = null;

  setQuery(query: ICashflowAccountTransactionsQuery) {
    this.query = query;
  }

  /**
   * Async initalize the resources.
   */
  async asyncInit() {
    await this.initArticleAccounts();
    await this.initCashflowAccountTransactions();
    await this.initCashflowAccountOpeningBalance();
    await this.initCategorizedTransactions();
    await this.initMatchedTransactions();
  }

  /**
   * Накладывает отборы списка операций на запрос.
   *
   * Счёт здесь необязателен: без него список идёт по всем счетам организации
   * (экран «Операции», этап 3 ТЗ). Остальные отборы — период, направление
   * движения денег, контрагент, сумма и поиск по тексту.
   */
  /**
   * Разворачивает статью в её счета — вместе с подстатьями.
   *
   * Неизвестная статья в адресе НЕ считается «показать всё»: список молча
   * стал бы шире, чем человек просил. Считаем её статьёй без счетов —
   * список выйдет пустым и честным.
   */
  private async initArticleAccounts() {
    const articleId = (this.query as any)?.articleId;

    if (!articleId) {
      this.articleAccountIds = null;
      return;
    }

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

    this.articleAccountIds = [
      ...new Set(links.map((link: any) => link.accountId)),
    ];
  }

  private applyFilters(query: any) {
    const {
      accountId,
      fromDate,
      toDate,
      flow,
      contactId,
      search,
      minAmount,
      maxAmount,
    } = this.query;

    if (accountId) {
      query.where('account_id', accountId);
    }
    if (fromDate) {
      query.where('date', '>=', fromDate);
    }
    if (toDate) {
      query.where('date', '<=', toDate);
    }
    // Приход лежит в дебете, расход — в кредите.
    if (flow === 'in') {
      query.where('debit', '>', 0);
    } else if (flow === 'out') {
      query.where('credit', '>', 0);
    }
    if (contactId) {
      query.where('contact_id', contactId);
    }
    if (typeof minAmount === 'number') {
      query.where((builder: any) => {
        builder.where('debit', '>=', minAmount).orWhere('credit', '>=', minAmount);
      });
    }
    if (typeof maxAmount === 'number') {
      query.where((builder: any) => {
        builder.where('debit', '<=', maxAmount).andWhere('credit', '<=', maxAmount);
      });
    }
    /**
     * ОТБОР ПО СТАТЬЕ (FIN-005 ТЗ-2).
     *
     * У денежной проводки статьи нет: статья висит на ВСТРЕЧНОМ счёте
     * документа. Поэтому отбираются документы, задевшие счета статьи, и
     * остаются их денежные ноги. Тот же набор, что дало бы раскрытие без
     * ограничения в двести строк, — это и есть требование ТЗ.
     */
    if (this.articleAccountIds !== null) {
      if (this.articleAccountIds.length === 0) {
        // Статья без счетов: операций по ней не бывает. Невыполнимое
        // условие честнее, чем незаметно снятый отбор.
        query.whereRaw('1 = 0');
      } else {
        const accountIds = this.articleAccountIds;

        query.whereIn(['reference_type', 'reference_id'], (builder: any) => {
          builder
            .select('reference_type', 'reference_id')
            .from('accounts_transactions')
            .whereIn('account_id', accountIds);
        });
      }
    }
    if (search) {
      const like = `%${search}%`;
      query.where((builder: any) => {
        builder
          .where('transaction_number', 'like', like)
          .orWhere('reference_number', 'like', like)
          .orWhere('note', 'like', like);
      });
    }
    return query;
  }

  /**
   * Retrieve the cashflow account transactions.
   * @param {number} tenantId -
   * @param {ICashflowAccountTransactionsQuery} query -
   */
  async initCashflowAccountTransactions() {
    const query = this.accountTransactionModel().query();

    this.applyFilters(query);

    // Счёт и контрагент нужны списку по всем счетам: без них в строке не
    // видно, откуда деньги и кому платили (этап 3 ТЗ). На экране одного
    // счёта эти поля просто не показываются.
    query.withGraphFetched('account');
    query.withGraphFetched('contact');

    const { results, pagination } = await query
      .orderBy([
        { column: 'date', order: 'desc' },
        { column: 'created_at', order: 'desc' },
      ])
      .pagination(this.query.page - 1, this.query.pageSize);

    this.transactions = results;
    this.pagination = pagination;
  }

  /**
   * Retrieve the cashflow account opening balance.
   * @param {number} tenantId
   * @param {number} accountId
   * @param {IPaginationMeta} pagination
   * @return {Promise<number>}
   */
  async initCashflowAccountOpeningBalance(): Promise<void> {
    // Без выбранного счёта входящий остаток не имеет смысла: строки идут по
    // разным счетам, и накопительный итог по ним ничего не значит. Отдаём
    // ноль — витрина в этом случае колонку остатка не показывает.
    if (!this.query.accountId) {
      this.openingBalance = 0;
      return;
    }
    // Retrieve the opening balance of credit and debit balances.
    const openingBalancesSubquery = this.accountTransactionModel()
      .query()
      .where('account_id', this.query.accountId)
      .orderBy([
        { column: 'date', order: 'desc' },
        { column: 'created_at', order: 'desc' },
      ])
      .limit(this.pagination.total)
      .offset(this.pagination.pageSize * (this.pagination.page - 1));

    // Sumation of credit and debit balance.
    const openingBalances = await this.accountTransactionModel()
      .query()
      .sum('credit as credit')
      .sum('debit as debit')
      .from(openingBalancesSubquery.as('T'))
      .first();

    const openingBalance = openingBalances.debit - openingBalances.credit;

    this.openingBalance = openingBalance;
  }

  /**
   * Initialize the uncategorized transactions of the bank account.
   */
  async initCategorizedTransactions() {
    const refs = this.transactions.map((t) => [t.referenceType, t.referenceId]);
    const uncategorizedTransactions =
      await this.uncategorizedBankTransactionModel()
        .query()
        .whereIn(['categorizeRefType', 'categorizeRefId'], refs);

    this.uncategorizedTransactions = uncategorizedTransactions;
    this.uncategorizedTransactionsMapByRef = groupUncategorizedTransactions(
      uncategorizedTransactions,
    );
  }

  /**
   * Initialize the matched bank transactions of the bank account.
   */
  async initMatchedTransactions(): Promise<void> {
    const refs = this.transactions.map((t) => [t.referenceType, t.referenceId]);

    const matchedBankTransactions = await this.matchedBankTransactionModel()
      .query()
      .whereIn(['referenceType', 'referenceId'], refs);
    this.matchedBankTransactions = matchedBankTransactions;
    this.matchedBankTransactionsMapByRef = groupMatchedBankTransactions(
      matchedBankTransactions,
    );
  }
}
