import { Inject, Injectable, Scope } from '@nestjs/common';
import { Knex } from 'knex';
import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';
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
import { applyTransactionFilters } from '../../utils/applyTransactionFilters';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';

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
   * Документы строк текущей страницы: `вид:номер` → остаток и срок.
   *
   * НУЖНЫ ДЛЯ СОСТОЯНИЙ (FIN-003). «Нам должны», «мы должны» и
   * «просрочено» живут НЕ в проводке, а в документе, который её
   * породил: только он знает остаток к оплате и срок.
   */
  public documentsByReference: Map<string, any> = new Map();

  /**
   * Какое автоправило разнесло денежную операцию (FT-036 ТЗ-3): номер
   * операции → правило. По нему строка реестра получает бейдж «А».
   */
  public ruleApplicationsByTransaction: Map<
    number,
    { ruleId: number; ruleName: string | null }
  > = new Map();

  /** Метки документов страницы (FT-025 ТЗ-3): «вид:номер» → метка. */
  public tagsByReference: Map<string, string> = new Map();

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

    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,

    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,
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
    await this.initReferencedDocuments();
    await this.initRuleApplications();
    await this.initTags();
  }

  /**
   * Метки документов текущей страницы (FT-025 ТЗ-3) — одним запросом.
   * Метка живёт у документа, а не у проводки: проводки пишутся заново.
   */
  async initTags(): Promise<void> {
    this.tagsByReference = new Map();
    const pairs = [
      ...new Map(
        (this.transactions ?? []).map((t: any) => [
          `${t.referenceType}:${t.referenceId}`,
          [t.referenceType, Number(t.referenceId)],
        ]),
      ).values(),
    ];
    if (pairs.length === 0) return;
    const rows: any[] = await this.tenantKnex()('transaction_tags')
      .whereIn(['reference_type', 'reference_id'], pairs as any)
      .select('reference_type', 'reference_id', 'tag');
    rows.forEach((row) =>
      this.tagsByReference.set(`${row.referenceType}:${row.referenceId}`, row.tag),
    );
  }

  /**
   * След автоправил для строк текущей страницы (FT-036 ТЗ-3) — одним
   * запросом. Таблицу читаем напрямую: модели следа живут в модуле правил,
   * а подключить его сюда значило бы замкнуть модули в кольцо.
   *
   * Сбой не роняет реестр: без бейджа «А» строка остаётся строкой.
   */
  async initRuleApplications(): Promise<void> {
    this.ruleApplicationsByTransaction = new Map();
    const ids = [
      ...new Set(
        (this.transactions ?? [])
          .filter((t: any) => t.referenceType === 'CashflowTransaction')
          .map((t: any) => Number(t.referenceId)),
      ),
    ];
    if (ids.length === 0) return;
    try {
      const rows: any[] = await this.tenantKnex()('transaction_rule_applications as a')
        .leftJoin('bank_rules as r', 'r.id', 'a.rule_id')
        .whereIn('a.transaction_id', ids)
        .select('a.transaction_id', 'a.rule_id', 'r.name')
        .orderBy('a.id', 'asc');
      // Последнее применение побеждает: оно и определило, что сейчас стоит.
      rows.forEach((row) =>
        this.ruleApplicationsByTransaction.set(Number(row.transactionId), {
          ruleId: Number(row.ruleId),
          ruleName: row.name ?? null,
        }),
      );
    } catch (error) {
      console.error('[registry] не удалось прочитать след автоправил', error);
    }
  }

  /**
   * Срок оплаты в виде `ГГГГ-ММ-ДД`.
   *
   * НАЙДЕНО ЖИВЫМ ПРОХОДОМ. Расчёт состояний сравнивает срок с сегодняшним
   * днём КАК СТРОКИ, а модель отдаёт дату объектом. Сравнение объекта со
   * строкой в JavaScript не падает — оно молча даёт «не просрочено», и
   * пометка «просрочено» не появлялась НИ РАЗУ, хотя отбор по просрочке
   * находил восемнадцать строк.
   */
  private static dueDateOf(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date.toISOString().slice(0, 10);
  }

  /**
   * Догружает документы строк текущей страницы (FIN-003 ТЗ-2).
   *
   * ТОЛЬКО ТЕКУЩАЯ СТРАНИЦА: строк на ней не больше размера страницы, и
   * это два запроса на страницу, а не по запросу на строку.
   *
   * Сбой догрузки не роняет список: реестр без бейджей остаётся
   * реестром, а реестр, который не открылся, — нет.
   */
  async initReferencedDocuments(): Promise<void> {
    this.documentsByReference = new Map();

    const rows: any[] = this.transactions ?? [];
    const idsOf = (type: string): number[] =>
      rows
        .filter((row) => String(row.referenceType) === type)
        .map((row) => Number(row.referenceId))
        .filter(Boolean);

    const invoiceIds = idsOf('SaleInvoice');
    const billIds = idsOf('Bill');

    try {
      const [invoices, bills] = await Promise.all([
        invoiceIds.length
          ? this.saleInvoiceModel().query().whereIn('id', invoiceIds)
          : [],
        billIds.length ? this.billModel().query().whereIn('id', billIds) : [],
      ]);

      invoices.forEach((invoice: any) => {
        this.documentsByReference.set(`SaleInvoice:${invoice.id}`, {
          status: invoice.isDelivered === false ? 'draft' : 'delivered',
          balance: Number(invoice.dueAmount ?? 0),
          dueDate: GetBankAccountTransactionsRepository.dueDateOf(
            invoice.dueDate,
          ),
        });
      });
      bills.forEach((bill: any) => {
        this.documentsByReference.set(`Bill:${bill.id}`, {
          status: bill.isOpen === false ? 'draft' : 'opened',
          balance: Number(bill.dueAmount ?? 0),
          dueDate: GetBankAccountTransactionsRepository.dueDateOf(bill.dueDate),
        });
      });
    } catch (error) {
      console.error('Failed to load transaction documents:', error);
    }
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

  /**
   * Накладывает отборы списка на запрос.
   *
   * Сам набор условий живёт в общем помощнике: сводная строка внизу реестра
   * считает итоги под ТЕМ ЖЕ фильтром, и два набора условий однажды
   * разошлись бы тихо — «87 операций» над списком из 84.
   */
  private applyFilters(query: any) {
    return applyTransactionFilters(
      query,
      this.query as any,
      this.articleAccountIds,
    );
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
