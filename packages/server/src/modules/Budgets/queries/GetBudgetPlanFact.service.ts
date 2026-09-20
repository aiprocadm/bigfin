import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { Budget } from '../models/Budget.model';
import { BudgetLine } from '../models/BudgetLine.model';
import { ArticlesCashflowRollupService } from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { GetBudgetPlanFactQueryDto } from '../dtos/GetBudgetPlanFactQuery.dto';
import { PlanFactResponse, PlanFactRow } from '../Budgets.interfaces';
import { computeVariance } from '../utils/computeVariance';
import { computeBudgetPace } from '../utils/computeBudgetPace';
import { ERRORS } from '../constants';

@Injectable()
export class GetBudgetPlanFactService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,

    @Inject(BudgetLine.name)
    private readonly lineModel: TenantModelProxy<typeof BudgetLine>,

    private readonly plRollup: ArticlesPlRollupService,
    private readonly cashRollup: ArticlesCashflowRollupService,
  ) {}

  /**
   * Builds the plan-fact report for a budget over a period.
   * @param {number} budgetId
   * @param {GetBudgetPlanFactQueryDto} query
   * @returns {Promise<PlanFactResponse>}
   */
  public async getPlanFact(
    budgetId: number,
    query: GetBudgetPlanFactQueryDto,
  ): Promise<PlanFactResponse> {
    const budget = await this.budgetModel().query().findById(budgetId);
    if (!budget) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    const scenario = query.scenario || budget.activeScenario;

    // План: сумма budget_lines по статье за период и сценарий.
    const lines = await this.lineModel()
      .query()
      .onBuild((qb) => {
        qb.where('budgetId', budgetId);
        qb.where('scenario', scenario);
        qb.where('period', '>=', query.fromDate);
        qb.where('period', '<=', query.toDate);
      });
    const planByArticle = new Map<number, number>();
    (lines as any[]).forEach((l) => {
      planByArticle.set(
        l.articleId,
        (planByArticle.get(l.articleId) || 0) + Number(l.plannedAmount),
      );
    });

    // Факт: БДиР → P&L rollup; БДДС → cash rollup. Оба возвращают [{id,name,kind,amount}].
    const rollupQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      branchesIds: query.branchesIds,
    } as any;
    const factRows =
      budget.type === 'bdds'
        ? await this.cashRollup.getRollup(rollupQuery)
        : await this.plRollup.getRollup(rollupQuery);

    const rows: PlanFactRow[] = (factRows as any[]).map((fr) => {
      const plan = planByArticle.get(fr.id) || 0;
      const fact = Number(fr.amount) || 0;
      const { varianceAbs, variancePct } = computeVariance(plan, fact);
      return {
        articleId: fr.id,
        name: fr.name,
        kind: fr.kind,
        plan,
        fact,
        varianceAbs,
        variancePct,
      };
    });

    /**
     * Темп исполнения (FIN-022 ТЗ-2).
     *
     * «Выполнено 56 %» само по себе не значит ничего: в июле это хорошо, в
     * декабре — беда. Рядом кладётся доля прошедшего времени и вывод
     * словами — два процента рядом читаются не всеми, фраза — всеми.
     */
    const totals = rows.reduce(
      (acc, row) => ({
        plan: acc.plan + Number(row.plan ?? 0),
        fact: acc.fact + Number(row.fact ?? 0),
      }),
      { plan: 0, fact: 0 },
    );
    const pace = computeBudgetPace(
      {
        fromDate: String(query.fromDate),
        toDate: String(query.toDate),
        planned: totals.plan,
        actual: totals.fact,
        kind: budget.type === 'bdir' ? 'income' : 'expense',
      },
      new Date().toISOString().slice(0, 10),
    );

    return {
      budgetId,
      type: budget.type,
      scenario,
      period: `${query.fromDate}..${query.toDate}`,
      rows,
      pace,
    };
  }
}
