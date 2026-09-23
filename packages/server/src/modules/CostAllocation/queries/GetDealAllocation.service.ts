// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { allocateByBase, AllocationBase, AllocationTarget } from '../utils/allocationBases';
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
    // Правила «по направлениям» (FT-011 ТЗ-3) — для управленческого ОПиУ, а
    // не для прибыльности сделки.
    const active = rules.filter(
      (r) =>
        r.isActive &&
        (r.targetType ?? 'deal') === 'deal' &&
        this.inWindow(r, period),
    );

    // Базы сделок считаются один раз на все правила, а не на каждое.
    const needsMetrics = active.some((r) => r.allocationKey !== 'manual_share');
    const metricsByDeal: Record<number, AllocationTarget> = needsMetrics
      ? await this.revenue.metricsByDeal(period)
      : {};

    const lines: DealAllocationLine[] = [];
    for (const r of active) {
      const pool = await this.pool.poolFor(r.sourceArticleId, period);
      if (pool <= 0) continue; // skip empty/negative overhead pools (v1)
      const split = allocateByBase(
        pool,
        r.allocationKey as AllocationBase,
        this.targetsFor(r, metricsByDeal),
        r.manualShares ?? {},
      ).amounts;
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

  /**
   * Цели правила. Пустой список — ВСЕ сделки: окно правила сохраняло
   * `[]` там, где человек ничего не выбирал, и такое правило молча не
   * распределяло ничего (найдено при разборе FT-011).
   */
  private targetsFor(
    r: any,
    metricsByDeal: Record<number, AllocationTarget>,
  ): AllocationTarget[] {
    if (r.allocationKey === 'manual_share') {
      return Object.keys(r.manualShares ?? {}).map((id) => ({
        ...(metricsByDeal[Number(id)] ?? {}),
        id: Number(id),
        name: metricsByDeal[Number(id)]?.name ?? `№ ${id}`,
      }));
    }
    const chosen: number[] | null =
      (r.targetIds?.length ? r.targetIds : null) ??
      (r.targetDealIds?.length ? r.targetDealIds : null);
    const ids = chosen ?? Object.keys(metricsByDeal).map(Number);
    return ids.map(
      (id) => metricsByDeal[id] ?? { id, name: `№ ${id}`, revenue: 0 },
    );
  }
}
