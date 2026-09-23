// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { cashSettledReferenceKeys } from '@/modules/Budgets/utils/cashSettledReferenceKeys';
import { CASH_ACCOUNT_TYPES } from '@/modules/Budgets/constants';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { formatNumber } from '@/utils/format-number';
import {
  applyManagementReportScope,
  ManagementReportScope,
} from '@/modules/ManagementArticles/utils/managementReportScope';
import {
  isCreditNormalAccount,
  reportAccountNet,
} from './reportAccountNet';

export interface DrillDownRow {
  date: string;
  transactionNumber: string | null;
  referenceNumber: string | null;
  referenceType: string | null;
  contactName: string | null;
  note: string | null;
  debit: number;
  credit: number;
  /** Вклад строки в сумму отчёта — с учётом стороны счёта. */
  amount: number;
  formattedAmount: string;
}

export interface DrillDownResult {
  accountId: number;
  accountName: string;
  /**
   * Заполняются ТОЛЬКО при раскрытии по статье (FIN-004 ТЗ-2).
   *
   * У прежнего вызова по счёту их нет вовсе — не `null`, а отсутствуют:
   * тогда ответ побайтно совпадает с прежним, и ни один читатель ответа не
   * замечает, что ручка научилась новому.
   */
  articleId?: number;
  articleName?: string;
  fromDate: string;
  toDate: string;
  /** Итог: обязан совпасть с суммой в отчёте до копейки. */
  total: number;
  formattedTotal: string;
  /**
   * Остаток на начало периода — всё, что накопилось ДО первого дня.
   *
   * Нужен Балансу и Движению денег. Их строка — не оборот за период, а
   * ОСТАТОК на дату, и сумма операций периода с ним никогда не сойдётся.
   * Сходится другое равенство: остаток на начало + оборот = остаток на конец.
   */
  openingBalance: number;
  formattedOpeningBalance: string;
  /** Остаток на конец: начало плюс оборот. Именно он стоит в Балансе. */
  closingBalance: number;
  formattedClosingBalance: string;
  /** Сколько операций в периоде всего — список может быть обрезан. */
  transactionsCount: number;
  /** Список показан не целиком. */
  isTruncated: boolean;
  transactions: DrillDownRow[];
  currencyCode: string;
}

/**
 * Отбор отчёта, из ячейки которого раскрывают сумму (FT-004 ТЗ-3), и
 * границы всего отчёта — по ним считается признак «оплачено деньгами».
 */
export interface DrillDownScope extends ManagementReportScope {
  reportFrom?: string;
  reportTo?: string;
}

/** Сколько строк показываем за раз: длинный список никто не читает целиком. */
export const DRILL_DOWN_LIMIT = 200;

/**
 * Раскрытие суммы отчёта до операций (этап 4 ТЗ, п. 4.2).
 *
 * ТЗ называет это ключевым требованием дословно: «без него пользователь не
 * доверяет цифрам и уходит обратно в Excel». Поэтому здесь важнее всего
 * не список сам по себе, а его ИТОГ: он обязан совпасть с числом, по которому
 * человек щёлкнул.
 *
 * Чтобы совпадал, вклад каждой строки считается тем же правилом, что и в
 * отчётах: у счетов с нормальной стороной «кредит» (доходы, обязательства)
 * это кредит минус дебет, у остальных — наоборот. Складывать «как есть»
 * нельзя: половина строк уйдёт с обратным знаком, и итог разойдётся с
 * отчётом, оставив человека в уверенности, что врут обе цифры.
 */
@Injectable()
export class GetReportDrillDownService {
  constructor(
    private readonly tenancyContext: TenancyContext,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Раскрытие суммы ПО СТАТЬЕ (FIN-004 ТЗ-2).
   *
   * ЗАЧЕМ ОТДЕЛЬНЫЙ ВХОД. Человек, щёлкнувший по строке «Аренда» в отчёте о
   * деньгах, ждёт список платежей за аренду, а не выписку по бухгалтерскому
   * счёту. Счёт — это внутреннее устройство, статья — его язык.
   *
   * ИТОГ ОБЯЗАН СОВПАСТЬ С ОТЧЁТОМ. Поэтому здесь повторяются ровно те же
   * два правила, что в расчёте отчёта: берутся ВСЕ счета статьи вместе с её
   * подстатьями (в отчёте родительская строка показывает поддерево целиком)
   * и только проводки документов, РАССЧИТАННЫХ ДЕНЬГАМИ — без переводов
   * между своими счетами. Разойдись хоть одно — и человек получит список,
   * который не сходится с числом, по которому он щёлкнул: ровно то
   * недоверие, ради устранения которого раскрытие и делалось.
   */
  public async getDrillDownByArticle(
    articleId: number,
    fromDate: string,
    toDate: string,
    scope: DrillDownScope = {},
  ): Promise<DrillDownResult> {
    const article: any = await this.articleModel().query().findById(articleId);

    if (!article) {
      throw new NotFoundException('ARTICLE_NOT_FOUND');
    }

    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency ?? 'RUB';

    const articleIds = await this.articleWithDescendants(articleId);
    const accountIds = await this.accountsOfArticles(articleIds);

    if (accountIds.length === 0) {
      return this.emptyArticleResult(article, fromDate, toDate, currencyCode);
    }

    const accounts: any[] = await this.accountModel()
      .query()
      .whereIn('id', accountIds);
    const creditNormalById = new Map<number, boolean>(
      accounts.map((account: any) => [
        account.id,
        isCreditNormalAccount(account),
      ]),
    );

    // Признак «оплачено деньгами» — по границам ВСЕГО отчёта и по отбору
    // без направлений: так же, как его считает сам отчёт (FT-004 ТЗ-3).
    const settledKeys = await this.cashSettledKeysOfPeriod(
      scope.reportFrom ?? fromDate,
      scope.reportTo ?? toDate,
      { ...scope, projectsIds: undefined },
    );
    const isSettled = (row: any) =>
      settledKeys.has(`${row.referenceType}:${row.referenceId}`);

    const periodRows: any[] = await this.transactionModel()
      .query()
      .whereIn('accountId', accountIds)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .modify((qb: any) => applyManagementReportScope(qb, scope))
      .withGraphFetched('contact')
      .orderBy('date', 'desc');

    const settledRows = periodRows.filter(isSettled);

    // ИТОГ СЧИТАЕТСЯ ПО ВСЕМ подходящим строкам периода, а показываются
    // только первые двести: сложив показанное, мы назвали бы человеку итог
    // меньше, чем в отчёте.
    const total = settledRows.reduce(
      (sum, row) =>
        sum +
        reportAccountNet(
          Number(row.debit ?? 0),
          Number(row.credit ?? 0),
          creditNormalById.get(row.accountId) ?? false,
        ),
      0,
    );

    const transactions = settledRows
      .slice(0, DRILL_DOWN_LIMIT)
      .map((row: any) => {
        const debit = Number(row.debit ?? 0);
        const credit = Number(row.credit ?? 0);
        const amount = reportAccountNet(
          debit,
          credit,
          creditNormalById.get(row.accountId) ?? false,
        );

        return {
          date: row.date,
          transactionNumber: row.transactionNumber ?? null,
          referenceNumber: row.referenceNumber ?? null,
          referenceType: row.referenceType ?? null,
          contactName: row.contact?.displayName ?? null,
          note: row.note ?? null,
          debit,
          credit,
          amount,
          formattedAmount: this.format(amount, currencyCode),
        };
      });

    return {
      accountId: 0,
      accountName: article.name,
      articleId,
      articleName: article.name,
      fromDate,
      toDate,
      total,
      formattedTotal: this.format(total, currencyCode),
      // У статьи остатка нет: она отвечает на вопрос «сколько прошло за
      // период», а не «сколько лежит». Ноль здесь — не «мы не посчитали», а
      // «такого понятия у статьи не существует».
      openingBalance: 0,
      formattedOpeningBalance: this.format(0, currencyCode),
      closingBalance: total,
      formattedClosingBalance: this.format(total, currencyCode),
      transactionsCount: settledRows.length,
      isTruncated: settledRows.length > transactions.length,
      transactions,
      currencyCode,
    };
  }

  /** Статья вместе со всеми подстатьями: в отчёте родитель показывает поддерево. */
  private async articleWithDescendants(rootId: number): Promise<number[]> {
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

    const result: number[] = [];
    const stack: number[] = [rootId];
    const seen = new Set<number>();

    while (stack.length > 0) {
      const current = stack.pop() as number;
      if (seen.has(current)) continue; // защита от кривого дерева
      seen.add(current);
      result.push(current);
      (childrenByParent.get(current) ?? []).forEach((id) => stack.push(id));
    }

    return result;
  }

  /** Счета, привязанные к перечисленным статьям. */
  private async accountsOfArticles(articleIds: number[]): Promise<number[]> {
    if (articleIds.length === 0) return [];

    const rows: any[] = await this.articleAccountModel()
      .query()
      .whereIn('articleId', articleIds);

    return [...new Set(rows.map((row: any) => row.accountId))];
  }

  /**
   * Документы периода, РАССЧИТАННЫЕ ДЕНЬГАМИ.
   *
   * То же правило, что в расчёте отчёта: документ задел денежный счёт и не
   * является переводом между своими счетами. Считается общим помощником, а
   * не переписывается здесь: две реализации одного правила однажды
   * разойдутся, и разойдутся тихо.
   */
  private async cashSettledKeysOfPeriod(
    fromDate: string,
    toDate: string,
    scope: ManagementReportScope = {},
  ): Promise<Set<string>> {
    const cashAccounts: any[] = await this.accountModel()
      .query()
      .whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);
    const cashAccountIds = new Set<number>(
      cashAccounts.map((account: any) => account.id),
    );

    const legs: any[] = await this.transactionModel()
      .query()
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .modify((qb: any) => applyManagementReportScope(qb, scope));

    return cashSettledReferenceKeys(legs as any, (accountId: number) =>
      cashAccountIds.has(accountId),
    );
  }

  /** Статья без привязанных счетов: пусто — это ответ, а не ошибка. */
  private emptyArticleResult(
    article: any,
    fromDate: string,
    toDate: string,
    currencyCode: string,
  ): DrillDownResult {
    const zero = this.format(0, currencyCode);

    return {
      accountId: 0,
      accountName: article.name,
      articleId: article.id,
      articleName: article.name,
      fromDate,
      toDate,
      total: 0,
      formattedTotal: zero,
      openingBalance: 0,
      formattedOpeningBalance: zero,
      closingBalance: 0,
      formattedClosingBalance: zero,
      transactionsCount: 0,
      isTruncated: false,
      transactions: [],
      currencyCode,
    };
  }

  public async getDrillDown(
    accountId: number,
    fromDate: string,
    toDate: string,
  ): Promise<DrillDownResult> {
    const account: any = await this.accountModel()
      .query()
      .findById(accountId);

    if (!account) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }

    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency ?? 'RUB';

    const rows: any[] = await this.transactionModel()
      .query()
      .where('accountId', accountId)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .withGraphFetched('contact')
      .orderBy('date', 'desc')
      .limit(DRILL_DOWN_LIMIT);

    const isCreditNormal = isCreditNormalAccount(account);

    const transactions = rows.map((row) => {
      const debit = Number(row.debit ?? 0);
      const credit = Number(row.credit ?? 0);
      const amount = reportAccountNet(debit, credit, isCreditNormal);

      return {
        date: row.date,
        transactionNumber: row.transactionNumber ?? null,
        referenceNumber: row.referenceNumber ?? null,
        referenceType: row.referenceType ?? null,
        contactName: row.contact?.displayName ?? null,
        note: row.note ?? null,
        debit,
        credit,
        amount,
        formattedAmount: this.format(amount, currencyCode),
      };
    });

    // ИТОГ СЧИТАЕТСЯ ОТДЕЛЬНЫМ ЗАПРОСОМ, А НЕ ПО ПОКАЗАННЫМ СТРОКАМ.
    // Список обрезан до 200 операций; сложив только их, мы показали бы
    // человеку итог меньше, чем в отчёте, — ровно то недоверие к цифрам,
    // ради устранения которого раскрытие и делалось.
    const total = await this.netOverPeriod(
      accountId,
      fromDate,
      toDate,
      isCreditNormal,
    );

    // Остаток на начало: всё, что накоплено ДО первого дня периода.
    // Границы нет — у остатка нет «начала времён», он считается от самой
    // первой проводки счёта.
    const openingBalance = await this.netOverPeriod(
      accountId,
      null,
      this.dayBefore(fromDate),
      isCreditNormal,
    );

    const closingBalance = openingBalance + total;
    const transactionsCount = await this.countOverPeriod(
      accountId,
      fromDate,
      toDate,
    );

    return {
      accountId,
      accountName: account.name,
      fromDate,
      toDate,
      total,
      formattedTotal: this.format(total, currencyCode),
      openingBalance,
      formattedOpeningBalance: this.format(openingBalance, currencyCode),
      closingBalance,
      formattedClosingBalance: this.format(closingBalance, currencyCode),
      transactionsCount,
      isTruncated: transactionsCount > transactions.length,
      transactions,
      currencyCode,
    };
  }

  /**
   * Чистый оборот счёта за отрезок — одним запросом к базе.
   *
   * `from = null` означает «с самой первой проводки»: у остатка на начало
   * нижней границы нет.
   */
  private async netOverPeriod(
    accountId: number,
    from: string | null,
    to: string,
    isCreditNormal: boolean,
  ): Promise<number> {
    const query = this.transactionModel()
      .query()
      .where('accountId', accountId)
      .where('date', '<=', to);

    if (from !== null) {
      query.where('date', '>=', from);
    }
    const row: any = await query
      .sum('debit as debit')
      .sum('credit as credit')
      .first();

    return reportAccountNet(
      Number(row?.debit ?? 0),
      Number(row?.credit ?? 0),
      isCreditNormal,
    );
  }

  /** Сколько операций в периоде — чтобы честно сказать, что список обрезан. */
  private async countOverPeriod(
    accountId: number,
    fromDate: string,
    toDate: string,
  ): Promise<number> {
    const row: any = await this.transactionModel()
      .query()
      .where('accountId', accountId)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .count('id as total')
      .first();

    return Number(row?.total ?? 0);
  }

  /**
   * День перед началом периода.
   *
   * Остаток на начало — это состояние на КОНЕЦ предыдущего дня. Взять сам
   * `fromDate` нельзя: операции первого дня попали бы и в остаток, и в
   * оборот, и равенство «начало + оборот = конец» разошлось бы ровно на них.
   */
  private dayBefore(date: string): string {
    const value = new Date(`${date}T00:00:00Z`);

    value.setUTCDate(value.getUTCDate() - 1);

    return value.toISOString().slice(0, 10);
  }

  /**
   * Сумма для показа человеку — через ОБЩИЙ помощник (§5.2 ТЗ).
   *
   * Здесь стоял самодельный формат «число плюс код валюты»: раскрытие
   * показывало «1140000.00 RUB» там, где сам отчёт показывает
   * «1 140 000,00 ₽». Одна и та же сумма выглядела по-разному на экране и в
   * раскрытии — это прямо то, от чего человек перестаёт верить цифрам.
   */
  private format(amount: number, currencyCode: string): string {
    return formatNumber(amount, { currencyCode, money: true });
  }
}
