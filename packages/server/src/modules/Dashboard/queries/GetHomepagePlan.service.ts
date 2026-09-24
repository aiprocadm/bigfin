// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { Budget } from '@/modules/Budgets/models/Budget.model';
import { BudgetLine } from '@/modules/Budgets/models/BudgetLine.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { GetCalendarMatrixService } from '@/modules/PaymentCalendar/queries/GetCalendarMatrix.service';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';

import { computeProratedPlan, MonthlyPlan, ProratedPlan, round2 } from './computeProratedPlan';
import { buildCumulative, CumulativePoint } from './computeCumulative';

export interface PlanProgress extends ProratedPlan {
  /** Факт с начала периода по сегодня. */
  fact: number;
  /** Факт к пропорциональному плану, проценты; `null` — плана на эти дни нет. */
  completionPercent: number | null;
}

export interface DirectionPlanRow {
  /** Номер направления; `null` — строка «Без направления». */
  projectId: number | null;
  name: string | null;
  plan: number;
  fact: number;
  deviation: number;
  /** % выполнения; `null` — плана нет (процент к нулю не считается). */
  completionPercent: number | null;
}

export interface HomepagePlan {
  /** Бюджет, по которому считан план; `null` — бюджета на период нет. */
  budget: { id: number; name: string } | null;
  income: PlanProgress | null;
  expenses: PlanProgress | null;
  /** Накопленная выручка по дням против плана и базы сравнения (FT-062). */
  cumulative: CumulativePoint[];
  /** Поступления по направлениям: план календаря и факт (FT-063). */
  directions: DirectionPlanRow[] | null;
  /**
   * Доли в выручке для виджетов с целью (FT-065), проценты. `null` — выручки
   * нет, делить не на что. У ФОТ ещё `payrollConfigured`: без статьи
   * зарплаты в настройках раздела «Зарплата» считать долю не из чего.
   */
  shares: { expenses: number | null; payroll: number | null; payrollConfigured: boolean };
}

/** Выручка — доходные счета; «прочие доходы» тоже деньги бизнеса. */
const INCOME_TYPES = [ACCOUNT_TYPE.INCOME, ACCOUNT_TYPE.OTHER_INCOME];

/**
 * План на главной (FT-060, FT-062, FT-063 ТЗ-3).
 *
 * Своего расчёта плана здесь нет: план доходов и расходов — из бюджета
 * доходов и расходов (строки по статьям и месяцам), поступления по
 * направлениям — из той же матрицы платёжного календаря, что и экран
 * календаря. Иначе главная и разделы продукта разошлись бы цифрами.
 */
@Injectable()
export class GetHomepagePlanService {
  constructor(
    @Inject(Budget.name) private readonly budgetModel: TenantModelProxy<typeof Budget>,
    @Inject(BudgetLine.name) private readonly lineModel: TenantModelProxy<typeof BudgetLine>,
    @Inject(ManagementArticle.name) private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
    @Inject(AccountTransaction.name) private readonly ledgerModel: TenantModelProxy<typeof AccountTransaction>,
    @Inject(Account.name) private readonly accountModel: TenantModelProxy<typeof Account>,
    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<typeof ManagementArticleAccount>,
    private readonly calendarMatrix: GetCalendarMatrixService,
    private readonly tenancyContext: TenancyContext,
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => Promise<SettingsStore>,
  ) {}

  public async getPlan(
    period: { fromDate: string; toDate: string },
    base: { fromDate: string; toDate: string },
    facts: { income: number; expenses: number },
    today = moment().format('YYYY-MM-DD'),
  ): Promise<HomepagePlan> {
    const budget = await this.findBudget(period);
    const plans = budget ? await this.monthlyPlans(budget, period) : { income: [], expense: [] };
    const [factByDate, baseByDate] = await Promise.all([
      this.incomeByDate(period.fromDate, moment.min(moment(today), moment(period.toDate)).format('YYYY-MM-DD')),
      this.incomeByDate(base.fromDate, base.toDate),
    ]);
    const progress = (monthly: MonthlyPlan[], fact: number): PlanProgress | null => {
      if (!budget || monthly.length === 0) return null;
      const prorated = computeProratedPlan(monthly, period, today);
      return {
        ...prorated,
        fact: round2(fact),
        completionPercent:
          prorated.proratedPlan > 0 ? Math.round((fact / prorated.proratedPlan) * 1000) / 10 : null,
      };
    };

    return {
      budget: budget ? { id: Number(budget.id), name: budget.name } : null,
      income: progress(plans.income, facts.income),
      expenses: progress(plans.expense, facts.expenses),
      cumulative: buildCumulative({ period, base, today, factByDate, baseByDate, plans: plans.income }),
      directions: await this.directions(period).catch(() => null),
      shares: await this.shares(period, today, facts),
    };
  }

  /** Доля расходов и доля ФОТ в выручке периода (FT-065). */
  private async shares(
    period: { fromDate: string; toDate: string },
    today: string,
    facts: { income: number; expenses: number },
  ): Promise<HomepagePlan['shares']> {
    const share = (part: number) => (facts.income > 0 ? Math.round((part / facts.income) * 1000) / 10 : null);
    const store = await this.settingsStore();
    const payrollArticleId = Number(store.get({ group: 'payroll', key: 'payroll_article_id' }, null)) || null;
    if (!payrollArticleId) {
      return { expenses: share(facts.expenses), payroll: null, payrollConfigured: false };
    }
    // Статья зарплаты вместе с подстатьями — как в управленческом ОПиУ.
    const articles: any[] = await this.articleModel().query().select('id', 'parentId');
    const subtree = new Set<number>([payrollArticleId]);
    for (let grew = true; grew; ) {
      grew = false;
      articles.forEach((a) => {
        if (a.parentId && subtree.has(Number(a.parentId)) && !subtree.has(Number(a.id))) {
          subtree.add(Number(a.id));
          grew = true;
        }
      });
    }
    const links: any[] = await this.articleAccountModel().query().whereIn('articleId', [...subtree]).select('accountId');
    let payroll = 0;
    if (links.length) {
      const [row]: any[] = await this.ledgerModel()
        .query()
        .whereIn('accountId', links.map((l) => l.accountId))
        .where('date', '>=', period.fromDate)
        .where('date', '<=', moment.min(moment(today), moment(period.toDate)).format('YYYY-MM-DD'))
        .sum('debit as debit')
        .sum('credit as credit');
      payroll = (Number(row?.debit) || 0) - (Number(row?.credit) || 0);
    }
    return { expenses: share(facts.expenses), payroll: share(payroll), payrollConfigured: true };
  }

  /** Бюджет доходов и расходов года периода; из нескольких — последний. */
  private async findBudget(period: { fromDate: string }) {
    const year = moment(period.fromDate).year();
    const budgets: any[] = await this.budgetModel().query().where('type', 'bdir').where('fiscalYear', year).orderBy('id', 'desc');
    return budgets[0] ?? null;
  }

  /** Помесячный план доходов и расходов активного сценария бюджета. */
  private async monthlyPlans(budget: any, period: { fromDate: string; toDate: string }) {
    const lines: any[] = await this.lineModel()
      .query()
      .where('budgetId', budget.id)
      .where('scenario', budget.activeScenario ?? 'realistic')
      .where('period', '>=', moment(period.fromDate).startOf('month').format('YYYY-MM-DD'))
      .where('period', '<=', moment(period.toDate).startOf('month').format('YYYY-MM-DD'));
    const articles: any[] = await this.articleModel().query().select('id', 'kind');
    const kindOf = new Map(articles.map((a) => [Number(a.id), a.kind]));
    const sum = (kind: string): MonthlyPlan[] => {
      const byMonth = new Map<string, number>();
      lines
        .filter((line) => kindOf.get(Number(line.articleId)) === kind)
        .forEach((line) => {
          const month = moment(line.period).format('YYYY-MM-01');
          byMonth.set(month, (byMonth.get(month) ?? 0) + Number(line.plannedAmount));
        });
      return [...byMonth.entries()].map(([month, amount]) => ({ month, amount }));
    };
    return { income: sum('income'), expense: sum('expense') };
  }

  /**
   * Выручка по дням: кредит минус дебет доходных счетов. Внутригрупповые
   * обороты не выручка группы (§7.2 ТЗ-1) — как и в отчёте о прибылях.
   */
  private async incomeByDate(fromDate: string, toDate: string): Promise<Record<string, number>> {
    if (fromDate > toDate) return {};
    const accounts: any[] = await this.accountModel().query().whereIn('accountType', INCOME_TYPES).select('id');
    if (accounts.length === 0) return {};
    const rows: any[] = await this.ledgerModel()
      .query()
      .whereIn('accountId', accounts.map((a) => a.id))
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .where((q: any) => q.where('isIntercompany', false).orWhereNull('isIntercompany'))
      .select('date')
      .sum('credit as credit')
      .sum('debit as debit')
      .groupBy('date');
    const result: Record<string, number> = {};
    rows.forEach((row) => {
      result[moment(row.date).format('YYYY-MM-DD')] = (Number(row.credit) || 0) - (Number(row.debit) || 0);
    });
    return result;
  }

  /** Поступления по направлениям за период — из матрицы календаря. */
  private async directions(period: { fromDate: string; toDate: string }): Promise<DirectionPlanRow[]> {
    const tenant = await this.tenancyContext.getTenant();
    const matrix: any = await this.calendarMatrix.matrix(Number(tenant?.id), {
      fromDate: period.fromDate,
      toDate: period.toDate,
      granularity: 'month' as any,
      groupBy: 'projects',
    });
    return (matrix.inflowGroups ?? []).map((row: any) => {
      const plan = round2(row.cells.reduce((s: number, c: any) => s + (Number(c.plan) || 0), 0));
      const fact = round2(row.cells.reduce((s: number, c: any) => s + (Number(c.fact) || 0), 0));
      return {
        projectId: row.key === null || row.key === undefined ? null : Number(row.key),
        name: row.name ?? null,
        plan,
        fact,
        deviation: round2(fact - plan),
        completionPercent: plan > 0 ? Math.round((fact / plan) * 1000) / 10 : null,
      };
    });
  }
}
