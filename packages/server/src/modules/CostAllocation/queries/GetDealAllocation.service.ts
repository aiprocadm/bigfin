// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { allocatePool, AllocationWeight } from '../utils/allocatePool';
import { AllocationPoolService } from './AllocationPool.service';
import { DealsRevenueService } from './DealsRevenue.service';

export interface DealAllocationLine {
  ruleId: number;
  ruleName: string;
  articleId: number;
  amount: number;
}

@Injectable()
export class GetDealAllocationService {
  constructor(
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
    private readonly pool: AllocationPoolService,
    private readonly revenue: DealsRevenueService,
  ) {}

  public async getForDeal(
    dealId: number,
    period: { fromDate?: string; toDate?: string },
  ): Promise<DealAllocationLine[]> {
    const rules: any[] = await this.ruleModel().query();
    const active = rules.filter(
      (r) => r.isActive && this.inWindow(r, period),
    );

    // Compute the period's revenue-by-deal map once and reuse it for every
    // revenue-keyed rule, instead of recomputing the same map per rule.
    const needsRevenue = active.some((r) => r.allocationKey === 'revenue');
    const revenueByDeal = needsRevenue
      ? await this.revenue.revenueByDeal(period)
      : {};

    const lines: DealAllocationLine[] = [];
    for (const r of active) {
      const pool = await this.pool.poolFor(r.sourceArticleId, period);
      if (pool <= 0) continue; // skip empty/negative overhead pools (v1)
      const weights = this.weightsFor(r, revenueByDeal);
      const split = allocatePool(pool, weights);
      const mine = split.find((s) => s.dealId === dealId);
      if (mine && mine.amount !== 0) {
        lines.push({
          ruleId: r.id,
          ruleName: r.name,
          articleId: r.sourceArticleId,
          amount: mine.amount,
        });
      }
    }
    return lines;
  }

  private inWindow(
    r: any,
    p: { fromDate?: string; toDate?: string },
  ): boolean {
    if (p.toDate && r.validFrom && r.validFrom > p.toDate) return false;
    if (p.fromDate && r.validTo && r.validTo < p.fromDate) return false;
    return true;
  }

  private weightsFor(
    r: any,
    revenueByDeal: Record<number, number>,
  ): AllocationWeight[] {
    if (r.allocationKey === 'manual_share') {
      return Object.entries(r.manualShares ?? {}).map(([dealId, weight]) => ({
        dealId: Number(dealId),
        weight: Number(weight),
      }));
    }
    const ids: number[] =
      r.targetDealIds ?? Object.keys(revenueByDeal).map(Number);
    return ids.map((id: number) => ({ dealId: id, weight: revenueByDeal[id] ?? 0 }));
  }
}
