// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';
import { EmployeeKpiTarget } from '../models/EmployeeKpiTarget.model';
import { computeKpiBonus } from '../utils/computeKpiBonus';
import { toNumber, round2 } from '../utils/payrollMath';

export interface KpiSummaryRow {
  employeeId: number;
  fullName: string;
  metric: string;
  targetAmount: number;
  fact: number;
  achievementPct: number | null;
  bonus: number;
}

/**
 * План/факт/бонус по менеджерам за месяц. Факт — сделки с manager_id
 * менеджера через свёртку статей (паттерн DealsRevenueService): модель Deal
 * глобально зарегистрирована в Tenancy, Deals-модуль не импортируется —
 * DI-цикла нет. Считается on-the-fly, без кэш-таблиц.
 */
@Injectable()
export class GetPayrollKpiSummaryService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,

    @Inject(EmployeeKpiTarget.name)
    private readonly targetModel: TenantModelProxy<typeof EmployeeKpiTarget>,
  ) {}

  /** Сводка за месяц 'YYYY-MM': строки план/факт/%/бонус по менеджерам. */
  public async getSummary(month: string): Promise<KpiSummaryRow[]> {
    const periodMonth = moment(`${month}-01`).format('YYYY-MM-DD');
    return this.computeRows(periodMonth);
  }

  /**
   * Бонусы по сотрудникам за месяц (period_month — первое число месяца).
   * Переиспользуется CreatePayrollRun при пре-заполнении строк начисления.
   */
  public async bonusesForMonth(
    periodMonth: string,
  ): Promise<Record<number, number>> {
    const rows = await this.computeRows(periodMonth);
    return Object.fromEntries(rows.map((r) => [r.employeeId, r.bonus]));
  }

  private async computeRows(periodMonth: string): Promise<KpiSummaryRow[]> {
    const fromDate = moment(periodMonth).startOf('month').format('YYYY-MM-DD');
    const toDate = moment(periodMonth).endOf('month').format('YYYY-MM-DD');

    const targets: any[] = await this.targetModel()
      .query()
      .where('periodMonth', fromDate)
      .withGraphFetched('employee')
      .orderBy('periodMonth');
    if (targets.length === 0) return [];

    // Сделки с ответственным менеджером; сделки без менеджера не считаются.
    const managerIds = targets.map((t) => t.employeeId);
    const deals: any[] = await this.dealModel()
      .query()
      .whereIn('managerId', managerIds);

    // Свёртка статей по каждой сделке за календарный месяц плана.
    const margins = await Promise.all(
      deals.map(async (deal) => {
        const rows = await this.rollup.getRollup({
          projectId: deal.id,
          fromDate,
          toDate,
        } as any);
        return { managerId: deal.managerId, margin: computeDealMargin(rows as any) };
      }),
    );

    return targets.map((target) => {
      const fact = round2(
        margins
          .filter((m) => m.managerId === target.employeeId)
          .reduce(
            (sum, m) =>
              sum +
              toNumber(
                target.metric === 'profit' ? m.margin.profit : m.margin.revenue,
              ),
            0,
          ),
      );
      const { achievementPct, bonus } = computeKpiBonus(
        {
          metric: target.metric,
          targetAmount: target.targetAmount,
          bonusRate: target.bonusRate,
          onlyIfAchieved: !!target.onlyIfAchieved,
        },
        fact,
      );
      return {
        employeeId: target.employeeId,
        fullName: target.employee?.fullName || '',
        metric: target.metric,
        targetAmount: toNumber(target.targetAmount),
        fact,
        achievementPct,
        bonus,
      };
    });
  }
}
