// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';

/**
 * Computes revenue for each active deal over a period, without importing
 * the Deals module (avoiding a DI cycle). The Deal model token is globally
 * registered by Tenancy, and ArticlesPlRollupService is injected directly.
 */
@Injectable()
export class DealsRevenueService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  /**
   * Returns a map of dealId → revenue for the given period.
   * Mirrors the per-deal rollup approach used by GetDealsSummaryService.
   */
  public async revenueByDeal(period: {
    fromDate?: string;
    toDate?: string;
  }): Promise<Record<number, number>> {
    const deals: any[] = await this.dealModel().query();

    const entries = await Promise.all(
      deals.map(async (d) => {
        const rows = await this.rollup.getRollup({
          projectId: d.id,
          fromDate: period.fromDate,
          toDate: period.toDate,
        } as any);
        const { revenue } = computeDealMargin(rows as any);
        return [d.id, revenue] as const;
      }),
    );

    return Object.fromEntries(entries);
  }
}
