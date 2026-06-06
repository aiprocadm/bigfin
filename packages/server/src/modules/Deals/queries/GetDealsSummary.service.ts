// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { computeDealMargin } from '../utils/computeDealMargin';

@Injectable()
export class GetDealsSummaryService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async getSummary(query: { fromDate?: string; toDate?: string }) {
    const deals: any[] = await this.dealModel().query();

    const rows = await Promise.all(
      deals.map(async (d) => {
        const r = await this.rollup.getRollup({
          projectId: d.id,
          fromDate: query.fromDate,
          toDate: query.toDate,
        } as any);
        const m = computeDealMargin(r as any);
        return { id: d.id, name: d.name, status: d.status, ...m };
      }),
    );

    rows.sort((a, b) => b.profit - a.profit);

    const totals = rows.reduce(
      (t, r) => ({
        revenue: t.revenue + r.revenue,
        costs: t.costs + r.costs,
        profit: t.profit + r.profit,
      }),
      { revenue: 0, costs: 0, profit: 0 },
    );

    return { deals: rows, totals };
  }
}
