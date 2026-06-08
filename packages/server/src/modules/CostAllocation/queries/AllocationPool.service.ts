// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';

@Injectable()
export class AllocationPoolService {
  constructor(private readonly rollup: ArticlesPlRollupService) {}

  /**
   * Returns the unassigned-overhead amount for a given cost article and period.
   * Calls getRollup with unassignedProject:true so only transactions with
   * projectId IS NULL are included, avoiding double-counting deal-bound costs.
   */
  public async poolFor(
    articleId: number,
    period: { fromDate?: string; toDate?: string },
  ): Promise<number> {
    const rows = await this.rollup.getRollup({
      unassignedProject: true,
      fromDate: period.fromDate,
      toDate: period.toDate,
    } as any);

    const row = rows.find((r: any) => r.id === articleId);
    return row?.amount ?? 0;
  }
}
