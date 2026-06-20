// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Employee } from '@/modules/Payroll/models/Employee.model';
import { FinancialOverviewQueryDto } from '../dtos/FinancialModel.dto';
import { computeRevenuePerEmployee, enumerateMonths } from '../utils/financialMath';

export interface MarginPoint {
  month: string; // 'YYYY-MM'
  revenue: number;
  profit: number;
  margin: number; // доля 0..1
}

export interface FinancialOverview {
  revenue: number;
  costs: number;
  profit: number;
  margin: number; // доля 0..1
  employeeCount: number;
  revenuePerEmployee: number;
  revenuePerEmployeeApplicable: boolean;
  marginOverTime: MarginPoint[];
}

/**
 * Обзор финмодели за период. Маржа компании = свёртка статей всей фирмы
 * (getRollup без projectId) через computeDealMargin. График «маржа во времени» —
 * та же свёртка помесячно. Считается on-the-fly, без кэш-таблиц.
 */
@Injectable()
export class GetFinancialOverviewService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async getOverview(
    query: FinancialOverviewQueryDto,
  ): Promise<FinancialOverview> {
    const fromDate =
      query.fromDate ?? moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate ?? moment().format('YYYY-MM-DD');

    const rows = await this.rollup.getRollup({ fromDate, toDate } as any);
    const margin = computeDealMargin(rows as any);

    const employeeCount = await this.countActiveEmployees();
    const rpe = computeRevenuePerEmployee(margin.revenue, employeeCount);

    const months = enumerateMonths(fromDate, toDate);
    const marginOverTime: MarginPoint[] = [];
    for (const month of months) {
      const mFrom = moment(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const mTo = moment(mFrom).endOf('month').format('YYYY-MM-DD');
      const mRows = await this.rollup.getRollup({
        fromDate: mFrom,
        toDate: mTo,
      } as any);
      const m = computeDealMargin(mRows as any);
      marginOverTime.push({
        month,
        revenue: m.revenue,
        profit: m.profit,
        margin: m.margin,
      });
    }

    return {
      revenue: margin.revenue,
      costs: margin.costs,
      profit: margin.profit,
      margin: margin.margin,
      employeeCount,
      revenuePerEmployee: rpe.value,
      revenuePerEmployeeApplicable: rpe.applicable,
      marginOverTime,
    };
  }

  private async countActiveEmployees(): Promise<number> {
    const res: any = await this.employeeModel()
      .query()
      .where('active', true)
      .count({ c: 'id' })
      .first();
    return Number(res?.c ?? 0);
  }
}
