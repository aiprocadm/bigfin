// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ArticlesCashflowRollupService } from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';
import { Budget } from '../models/Budget.model';
import { BudgetLine } from '../models/BudgetLine.model';
import { UpsertBudgetLinesService } from '../commands/UpsertBudgetLines.service';
import { autofillBudgetLines, cashPlanChain, MonthFact, PlanAnchor } from '../utils/budgetPlanning';

/** Денежные счета — те же, что у бюджета движения денег. */
const CASH_TYPES: string[] = [ACCOUNT_TYPE.CASH, ACCOUNT_TYPE.BANK, ACCOUNT_TYPE.CREDIT_CARD];

/**
 * Планирование в бюджете (FT-054, FT-056 ТЗ-3): автозаполнение из истории и
 * денежный план по месяцам с привязкой остатка.
 */
@Injectable()
export class BudgetPlanningService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
    @Inject(BudgetLine.name)
    private readonly lineModel: TenantModelProxy<typeof BudgetLine>,
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
    @Inject(AccountTransaction.name)
    private readonly ledgerModel: TenantModelProxy<typeof AccountTransaction>,
    private readonly plRollup: ArticlesPlRollupService,
    private readonly cashRollup: ArticlesCashflowRollupService,
    private readonly upsertLines: UpsertBudgetLinesService,
  ) {}

  private async budget(id: number): Promise<any> {
    const budget = await this.budgetModel().query().findById(id);
    if (!budget) throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    return budget;
  }

  /**
   * Предпросмотр автозаполнения: строки, которые лягут в бюджет, — без
   * записи. Факт берётся тем же сводом, что и колонка «факт» бюджета.
   */
  public async autofillPreview(id: number, input: { sourceYear?: number; coefficientPercent?: number; scenario?: string }) {
    const budget = await this.budget(id);
    const sourceYear = Number(input.sourceYear || Number(budget.fiscalYear) - 1);
    if (sourceYear >= Number(budget.fiscalYear) + 1 || sourceYear < 1990) {
      throw new ServiceError(
        'BUDGET_AUTOFILL_SOURCE_INVALID',
        'Год истории должен быть прошлым относительно бюджета',
        { sourceYear },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const scenario = input.scenario || budget.activeScenario;
    const facts: MonthFact[] = [];
    for (let month = 1; month <= 12; month += 1) {
      const from = moment(`${sourceYear}-${String(month).padStart(2, '0')}-01`);
      const query = { fromDate: from.format('YYYY-MM-DD'), toDate: from.endOf('month').format('YYYY-MM-DD') } as any;
      const rows: any[] =
        budget.type === 'bdds' ? await this.cashRollup.getRollup(query) : await this.plRollup.getRollup(query);
      facts.push({ month, rows: rows.map((row) => ({ id: Number(row.id), amount: Number(row.amount) || 0 })) });
    }
    const lines = autofillBudgetLines(facts, Number(budget.fiscalYear), Number(input.coefficientPercent || 0), scenario);
    return { budgetId: id, sourceYear, coefficientPercent: Number(input.coefficientPercent || 0), scenario, lines };
  }

  /** Записать автозаполнение — через тот же путь, что правка клеток. */
  public async autofillApply(id: number, input: { sourceYear?: number; coefficientPercent?: number; scenario?: string }) {
    const preview = await this.autofillPreview(id, input);
    if (preview.lines.length > 0) {
      await this.upsertLines.upsert(id, { lines: preview.lines } as any);
    }
    return { ...preview, saved: preview.lines.length };
  }

  /**
   * Денежный план по месяцам года бюджета (FT-056): плановое изменение
   * месяца — поступления минус выплаты по статьям бюджета; остаток на начало
   * (план) — от факта или от плана по настройке бюджета; факт — остатки
   * денежных счетов на конец прожитых месяцев.
   */
  public async cashPlan(id: number, scenarioOverride?: string, anchorOverride?: PlanAnchor) {
    const budget = await this.budget(id);
    const year = Number(budget.fiscalYear);
    const scenario = scenarioOverride || budget.activeScenario;
    const anchor: PlanAnchor = anchorOverride || (budget.planAnchor === 'plan' ? 'plan' : 'fact');

    const articles: any[] = await this.articleModel().query();
    const kindOf = new Map(articles.map((article) => [Number(article.id), article.kind]));
    const lines: any[] = await this.lineModel()
      .query()
      .where('budgetId', id)
      .where('scenario', scenario)
      .where('period', '>=', `${year}-01-01`)
      .where('period', '<=', `${year}-12-31`);
    const planNet = new Map<string, number>();
    for (const line of lines) {
      const key = moment(line.period).format('YYYY-MM');
      const sign = kindOf.get(Number(line.articleId)) === 'income' ? 1 : -1;
      planNet.set(key, (planNet.get(key) ?? 0) + sign * Math.abs(Number(line.plannedAmount)));
    }

    const cashIds = (await this.accountModel().query().whereIn('accountType', CASH_TYPES)).map((a: any) => Number(a.id));
    const legs: any[] = cashIds.length
      ? await this.ledgerModel()
          .query()
          .whereIn('accountId', cashIds)
          .where('date', '<=', `${year}-12-31`)
          .select('date', 'debit', 'credit')
      : [];
    let openingFact = 0;
    const factNet = new Map<string, number>();
    for (const leg of legs) {
      const amount = Number(leg.debit ?? 0) - Number(leg.credit ?? 0);
      const date = moment(leg.date).format('YYYY-MM-DD');
      if (date < `${year}-01-01`) openingFact += amount;
      else factNet.set(date.slice(0, 7), (factNet.get(date.slice(0, 7)) ?? 0) + amount);
    }

    const today = moment().format('YYYY-MM');
    let running = openingFact;
    const months = Array.from({ length: 12 }, (_, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`;
      running += factNet.get(key) ?? 0;
      return {
        period: `${key}-01`,
        planNet: planNet.get(key) ?? 0,
        // Месяц ещё не прожит — факта у него нет.
        factClosing: key < today ? running : null,
      };
    });
    return {
      budgetId: id,
      scenario,
      anchor,
      openingFact: Math.round(openingFact * 100) / 100,
      months: cashPlanChain(openingFact, months, anchor),
    };
  }
}
