// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';
import { Employee } from '@/modules/Payroll/models/Employee.model';
import { Branch } from '@/modules/Branches/models/Branch.model';
import {
  GetProductMarginService,
  ProductMarginItem,
} from './GetProductMargin.service';

export interface SegmentRow {
  id: number;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number; // доля 0..1
}

export interface SegmentProfitability {
  byDeal: SegmentRow[];
  byManager: SegmentRow[];
  byBranch: SegmentRow[];
  byProduct: ProductMarginItem[];
}

/**
 * Рентабельность в 4 разрезах за период. Свёртка статей по каждой сделке
 * считается ОДИН раз и переиспользуется для разрезов «по сделке» и
 * «по менеджеру» (паттерн GetDealsSummary / GetPayrollKpiSummary). Разрез
 * «по направлению» — свёртка с фильтром branchesIds. «По продукту» —
 * валовая маржа из GetProductMargin. Модели Deal/Employee/Branch
 * глобально зарегистрированы в Tenancy, их модули не импортируются.
 */
@Injectable()
export class GetSegmentProfitabilityService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,
    private readonly productMargin: GetProductMarginService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,

    @Inject(Branch.name)
    private readonly branchModel: TenantModelProxy<typeof Branch>,
  ) {}

  public async getSegments(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<SegmentProfitability> {
    const fromDate =
      query.fromDate ?? moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate ?? moment().format('YYYY-MM-DD');

    const deals: any[] = await this.dealModel().query();

    // Свёртка по каждой сделке — единожды, переиспользуется ниже.
    const dealMargins = await Promise.all(
      deals.map(async (deal) => {
        const rows = await this.rollup.getRollup({
          projectId: deal.id,
          fromDate,
          toDate,
        } as any);
        return { deal, margin: computeDealMargin(rows as any) };
      }),
    );

    const [byDeal, byManager, byBranch, byProduct] = await Promise.all([
      Promise.resolve(this.buildByDeal(dealMargins)),
      this.buildByManager(dealMargins),
      this.buildByBranch(fromDate, toDate),
      this.productMargin
        .getProductMargin({ fromDate, toDate })
        .then((r) => r.products),
    ]);

    return { byDeal, byManager, byBranch, byProduct };
  }

  private buildByDeal(
    dealMargins: { deal: any; margin: ReturnType<typeof computeDealMargin> }[],
  ): SegmentRow[] {
    return dealMargins
      .map(({ deal, margin }) => ({
        id: deal.id,
        name: deal.name,
        revenue: margin.revenue,
        costs: margin.costs,
        profit: margin.profit,
        margin: margin.margin,
      }))
      .sort((a, b) => b.profit - a.profit);
  }

  /** Сделки без ответственного менеджера не учитываются (как в KPI-сводке). */
  private async buildByManager(
    dealMargins: { deal: any; margin: ReturnType<typeof computeDealMargin> }[],
  ): Promise<SegmentRow[]> {
    const byManagerId = new Map<
      number,
      { revenue: number; costs: number; profit: number }
    >();
    for (const { deal, margin } of dealMargins) {
      if (deal.managerId == null) continue;
      const acc = byManagerId.get(deal.managerId) ?? {
        revenue: 0,
        costs: 0,
        profit: 0,
      };
      acc.revenue += margin.revenue;
      acc.costs += margin.costs;
      acc.profit += margin.profit;
      byManagerId.set(deal.managerId, acc);
    }
    if (byManagerId.size === 0) return [];

    const managerIds = [...byManagerId.keys()];
    const employees: any[] = await this.employeeModel()
      .query()
      .whereIn('id', managerIds)
      .select('id', 'fullName');
    const nameById = new Map<number, string>(
      employees.map((e) => [e.id, e.fullName]),
    );

    return managerIds
      .map((id) => {
        const acc = byManagerId.get(id)!;
        return {
          id,
          name: nameById.get(id) ?? `#${id}`,
          revenue: acc.revenue,
          costs: acc.costs,
          profit: acc.profit,
          margin: acc.revenue > 0 ? acc.profit / acc.revenue : 0,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

  private async buildByBranch(
    fromDate: string,
    toDate: string,
  ): Promise<SegmentRow[]> {
    const branches: any[] = await this.branchModel().query().select('id', 'name');

    const rows = await Promise.all(
      branches.map(async (b) => {
        const r = await this.rollup.getRollup({
          branchesIds: [b.id],
          fromDate,
          toDate,
        } as any);
        const m = computeDealMargin(r as any);
        return {
          id: b.id,
          name: b.name,
          revenue: m.revenue,
          costs: m.costs,
          profit: m.profit,
          margin: m.margin,
        };
      }),
    );

    return rows.sort((a, b) => b.profit - a.profit);
  }
}
