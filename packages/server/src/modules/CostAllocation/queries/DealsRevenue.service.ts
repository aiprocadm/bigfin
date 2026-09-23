// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { AllocationTarget } from '../utils/allocationBases';

@Injectable()
export class DealsRevenueService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => Promise<SettingsStore>,
  ) {}

  /**
   * Returns a map of dealId → revenue for the given period.
   * Mirrors the per-deal rollup approach used by GetDealsSummaryService.
   */
  public async revenueByDeal(period: {
    fromDate?: string;
    toDate?: string;
  }): Promise<Record<number, number>> {
    const metrics = await this.metricsByDeal(period);
    return Object.fromEntries(
      Object.entries(metrics).map(([id, m]) => [Number(id), m.revenue ?? 0]),
    );
  }

  /**
   * Базы распределения по сделкам (FT-011 ТЗ-3): выручка, валовая прибыль
   * сделки и ФОТ — сумма статьи зарплаты из настроек «Зарплаты» (с
   * подстатьями, как их и показывает свёртка).
   */
  public async metricsByDeal(period: {
    fromDate?: string;
    toDate?: string;
  }): Promise<Record<number, AllocationTarget>> {
    const deals: any[] = await this.dealModel().query();
    const store = await this.settingsStore();
    const payrollArticleId =
      Number(store?.get({ group: 'payroll', key: 'payroll_article_id' })) || null;

    const entries = await Promise.all(
      deals.map(async (d) => {
        const rows: any[] = await this.rollup.getRollup({
          projectId: d.id,
          fromDate: period.fromDate,
          toDate: period.toDate,
        } as any);
        const { revenue, profit } = computeDealMargin(rows as any);
        const payroll = payrollArticleId
          ? Number(rows.find((row) => row.id === payrollArticleId)?.amount ?? 0)
          : 0;
        const target: AllocationTarget = {
          id: d.id,
          name: d.name ?? `№ ${d.id}`,
          revenue,
          grossProfit1: profit,
          productionPayroll: payroll,
        };
        return [d.id, target] as const;
      }),
    );

    return Object.fromEntries(entries);
  }
}
