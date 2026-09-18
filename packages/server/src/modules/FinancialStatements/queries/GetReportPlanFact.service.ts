// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '@/modules/Budgets/models/Budget.model';
import { BudgetLine } from '@/modules/Budgets/models/BudgetLine.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { computeVariance } from '@/modules/Budgets/utils/computeVariance';
import { cashSettledReferenceKeys } from '@/modules/Budgets/utils/cashSettledReferenceKeys';
import { CASH_ACCOUNT_TYPES } from '@/modules/Budgets/constants';
import { isCreditNormalAccount, reportAccountNet } from './reportAccountNet';

/** Тип отчёта, к которому просят план. */
export type PlanFactReportKind = 'profit_loss' | 'cash_flow';

/**
 * Бюджет заведён на доходы и расходы («БДиР») или на движение денег («БДДС»).
 *
 * Опечатка здесь ничего не ломает вслух: сервер просто не найдёт бюджет и
 * честно ответит «бюджета нет», а колонки молча не появятся. Поэтому
 * значения сверяются с общим списком `BUDGET_TYPES` отдельной проверкой.
 */
export const BUDGET_TYPE_BY_REPORT: Record<PlanFactReportKind, string> = {
  profit_loss: 'bdir',
  cash_flow: 'bdds',
};

export interface PlanFactArticle {
  id: number;
  parentId?: number | null;
  /** 'income' | 'expense' */
  kind: string;
  plan: number;
}

export interface PlanFactAccountRow {
  accountId: number;
  plan: number;
  /** Факт за тот же период — тем же правилом стороны счёта, что и отчёт. */
  fact: number;
  varianceAbs: number;
  /** null, когда плана нет: делить на ноль нечем. */
  variancePct: number | null;
}

export interface PlanFactSide {
  plan: number;
  fact: number;
  varianceAbs: number;
  variancePct: number | null;
}

export interface ReportPlanFactResponse {
  /** Бюджета на этот период нет — колонки «План» не показываются вовсе. */
  available: boolean;
  budgetName?: string;
  scenario?: string;
  accounts: PlanFactAccountRow[];
  /** Итоги по видам — там сходится и план статей без своего счёта. */
  totals: { income: PlanFactSide; expense: PlanFactSide };
}

const emptySide = (): PlanFactSide => ({
  plan: 0,
  fact: 0,
  varianceAbs: 0,
  variancePct: null,
});

/**
 * Не считать один и тот же план дважды.
 *
 * План можно задать и на группу статей, и на статью внутри неё. Если сложить
 * всё подряд, итог «План» вырастет вдвое там, где бюджет заполнен аккуратнее
 * всего, — и человек увидит, что «сильно недовыполнил план», хотя выполнил.
 *
 * Правило: статья учитывается, только если ни у одной из её вышестоящих
 * статей плана нет.
 */
export function withoutDoubleCountedPlans(
  articles: PlanFactArticle[],
): PlanFactArticle[] {
  const byId = new Map<number, PlanFactArticle>();
  articles.forEach((article) => byId.set(article.id, article));

  const hasPlannedAncestor = (article: PlanFactArticle): boolean => {
    const seen = new Set<number>([article.id]);
    let parentId = article.parentId ?? null;

    while (parentId != null && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) return false;
      if (parent.plan !== 0) return true;
      parentId = parent.parentId ?? null;
    }
    return false;
  };

  return articles.filter(
    (article) => article.plan !== 0 && !hasPlannedAncestor(article),
  );
}

/**
 * Разносит план статей по счетам отчёта и считает отклонение.
 *
 * План живёт на статье, а в отчёте строки — счета. Одна статья может
 * собирать несколько счетов, и тогда её план **нельзя** приписать какому-то
 * одному из них: любое дробление было бы выдумкой. Такой план попадает
 * только в итог по виду (доход/расход) — там он сходится честно.
 *
 * Статья с единственным счётом — случай однозначный: план кладётся на строку
 * этого счёта.
 *
 * @param articles - статьи с планом за период
 * @param map - какие счета собраны в какую статью
 * @param factByAccount - факт по счёту за тот же период
 */
export function attributePlanToAccounts(
  articles: PlanFactArticle[],
  map: { articleId: number; accountId: number }[],
  factByAccount: Map<number, number> = new Map(),
): {
  accounts: PlanFactAccountRow[];
  totals: { income: PlanFactSide; expense: PlanFactSide };
} {
  const accountsByArticle = new Map<number, number[]>();
  map.forEach(({ articleId, accountId }) => {
    const list = accountsByArticle.get(articleId) ?? [];
    list.push(accountId);
    accountsByArticle.set(articleId, list);
  });

  const planByAccount = new Map<number, number>();
  const totals = { income: emptySide(), expense: emptySide() };

  withoutDoubleCountedPlans(articles).forEach((article) => {
    const side =
      article.kind === 'income'
        ? totals.income
        : article.kind === 'expense'
          ? totals.expense
          : null;

    if (side) {
      side.plan += article.plan;
      // Факт итога считается по тем же статьям, что и план: сравнивать
      // план одних статей с фактом других — значит сравнивать разное.
      (accountsByArticle.get(article.id) ?? []).forEach((accountId) => {
        side.fact += factByAccount.get(accountId) ?? 0;
      });
    }

    const accounts = accountsByArticle.get(article.id) ?? [];
    if (accounts.length !== 1) return;

    const accountId = accounts[0];
    planByAccount.set(
      accountId,
      (planByAccount.get(accountId) ?? 0) + article.plan,
    );
  });

  [totals.income, totals.expense].forEach((side) => {
    const { varianceAbs, variancePct } = computeVariance(side.plan, side.fact);
    side.varianceAbs = varianceAbs;
    side.variancePct = variancePct;
  });

  const accounts = [...planByAccount.entries()].map(([accountId, plan]) => {
    const fact = factByAccount.get(accountId) ?? 0;
    const { varianceAbs, variancePct } = computeVariance(plan, fact);
    return { accountId, plan, fact, varianceAbs, variancePct };
  });

  return { accounts, totals };
}

@Injectable()
export class GetReportPlanFactService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,

    @Inject(BudgetLine.name)
    private readonly budgetLineModel: TenantModelProxy<typeof BudgetLine>,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * План и отклонение по строкам отчёта за период — если на этот год заведён
   * бюджет подходящего вида. Иначе `available: false`, и отчёт рисуется
   * как раньше.
   */
  public async getPlanFact(
    report: PlanFactReportKind,
    fromDate: string,
    toDate: string,
  ): Promise<ReportPlanFactResponse> {
    const empty: ReportPlanFactResponse = {
      available: false,
      accounts: [],
      totals: { income: emptySide(), expense: emptySide() },
    };

    const fiscalYear = Number(String(fromDate).slice(0, 4));
    if (!Number.isFinite(fiscalYear)) return empty;

    // Бюджетов на год может быть несколько (пересобрали, завели заново) —
    // берём последний заведённый: он и есть действующий.
    const budget = await this.budgetModel()
      .query()
      .where('type', BUDGET_TYPE_BY_REPORT[report])
      .where('fiscalYear', fiscalYear)
      .orderBy('id', 'desc')
      .first();

    if (!budget) return empty;

    const lines = await this.budgetLineModel()
      .query()
      .where('budgetId', budget.id)
      .where('scenario', budget.activeScenario)
      .where('period', '>=', fromDate)
      .where('period', '<=', toDate);

    const planByArticle = new Map<number, number>();
    (lines as any[]).forEach((line) => {
      const articleId = Number(line.articleId);
      planByArticle.set(
        articleId,
        (planByArticle.get(articleId) ?? 0) + Number(line.plannedAmount ?? 0),
      );
    });

    // Плана за период нет — пустая колонка из нулей хуже её отсутствия:
    // она утверждает, что план нулевой, хотя его просто не заводили.
    if (planByArticle.size === 0) return empty;

    const articleRows = await this.articleModel().query();
    const articles: PlanFactArticle[] = (articleRows as any[]).map((row) => ({
      id: Number(row.id),
      parentId: row.parentId ?? null,
      kind: String(row.kind),
      plan: planByArticle.get(Number(row.id)) ?? 0,
    }));

    const mapRows = await this.articleAccountModel().query();
    const map = (mapRows as any[]).map((row) => ({
      articleId: Number(row.articleId),
      accountId: Number(row.accountId),
    }));

    // У бюджета движения денег факт — только ОПЛАЧЕННОЕ. Считать его так
    // же, как для прибыли, значит записать в факт выставленные, но не
    // оплаченные счета — и показать выполнение плана, которого не было.
    const factByAccount =
      report === 'cash_flow'
        ? await this.getCashSettledFactByAccount(fromDate, toDate)
        : await this.getFactByAccount(fromDate, toDate);
    const { accounts, totals } = attributePlanToAccounts(
      articles,
      map,
      factByAccount,
    );

    return {
      available: true,
      budgetName: budget.name,
      scenario: budget.activeScenario,
      accounts,
      totals,
    };
  }

  /**
   * Кассовый факт по счетам за период: только операции, которые реально
   * задели деньги.
   *
   * Правило отбора взято из бюджета движения денег
   * (`cashSettledReferenceKeys`), а не написано заново: иначе сводка в
   * отчёте и экран «Бюджеты → План-факт» показывали бы разные числа по
   * одному и тому же бюджету.
   *
   * Перевод между своими счетами деньгами не считается: он ничего не
   * зарабатывает и не тратит, только перекладывает.
   */
  private async getCashSettledFactByAccount(
    fromDate: string,
    toDate: string,
  ): Promise<Map<number, number>> {
    const cashAccounts: any[] = await this.accountModel()
      .query()
      .whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);

    const cashAccountIds = new Set<number>(
      cashAccounts.map((account) => Number(account.id)),
    );

    const legs: any[] = await this.transactionModel()
      .query()
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate);

    const settledKeys = cashSettledReferenceKeys(legs as any, (accountId) =>
      cashAccountIds.has(Number(accountId)),
    );

    const totals = new Map<number, { debit: number; credit: number }>();
    legs.forEach((leg) => {
      const key = `${leg.referenceType}:${leg.referenceId}`;
      if (!settledKeys.has(key)) return;

      const accountId = Number(leg.accountId);
      const current = totals.get(accountId) ?? { debit: 0, credit: 0 };
      current.debit += Number(leg.debit ?? 0);
      current.credit += Number(leg.credit ?? 0);
      totals.set(accountId, current);
    });

    if (totals.size === 0) return new Map();

    const accountRows: any[] = await this.accountModel()
      .query()
      .whereIn('id', [...totals.keys()]);

    const creditNormalById = new Map<number, boolean>();
    accountRows.forEach((account) => {
      creditNormalById.set(Number(account.id), isCreditNormalAccount(account));
    });

    const factByAccount = new Map<number, number>();
    totals.forEach((sums, accountId) => {
      factByAccount.set(
        accountId,
        reportAccountNet(
          sums.debit,
          sums.credit,
          creditNormalById.get(accountId) ?? false,
        ),
      );
    });

    return factByAccount;
  }

  /**
   * Факт по счетам за период — одним запросом с группировкой.
   *
   * Тянуть проводки в память нельзя: за год их десятки тысяч, а нужны только
   * суммы. Знак берётся из общего правила `reportAccountNet` — того же, что
   * у раскрытия суммы до операций, поэтому числа не разойдутся.
   */
  private async getFactByAccount(
    fromDate: string,
    toDate: string,
  ): Promise<Map<number, number>> {
    const sums: any[] = await this.transactionModel()
      .query()
      .select('accountId')
      .sum('debit as debitSum')
      .sum('credit as creditSum')
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .groupBy('accountId');

    if (sums.length === 0) return new Map();

    const accountRows: any[] = await this.accountModel()
      .query()
      .whereIn(
        'id',
        sums.map((row) => Number(row.accountId)),
      );

    const creditNormalById = new Map<number, boolean>();
    accountRows.forEach((account) => {
      creditNormalById.set(Number(account.id), isCreditNormalAccount(account));
    });

    const factByAccount = new Map<number, number>();
    sums.forEach((row) => {
      const accountId = Number(row.accountId);
      factByAccount.set(
        accountId,
        reportAccountNet(
          row.debitSum,
          row.creditSum,
          creditNormalById.get(accountId) ?? false,
        ),
      );
    });

    return factByAccount;
  }
}
