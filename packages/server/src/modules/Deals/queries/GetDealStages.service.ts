// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { DealStage } from '../models/DealStage.model';
import { computeDealMargin } from '../utils/computeDealMargin';
import { summarizeDealStages, DealStagesSummary } from '../utils/recognizeStages';
import { ERRORS } from '../constants';

export interface DealStagesResult {
  stages: any[];
  summary: DealStagesSummary;
}

@Injectable()
export class GetDealStagesService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
    @Inject(DealStage.name)
    private readonly stageModel: TenantModelProxy<typeof DealStage>,
  ) {}

  public async getForDeal(
    dealId: number,
    period: { fromDate?: string; toDate?: string },
  ): Promise<DealStagesResult> {
    // Match GetDealProfitability: a bogus deal id is a 404, not an empty summary.
    const deal = await this.dealModel().query().findById(dealId);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);

    const stages: any[] = await this.stageModel()
      .query()
      .modify('forDeal', dealId)
      .orderBy('sortOrder');

    const rows = await this.rollup.getRollup({
      projectId: dealId,
      fromDate: period.fromDate,
      toDate: period.toDate,
    } as any);
    const fact = computeDealMargin(rows as any);

    const summary = summarizeDealStages(stages as any, {
      revenue: fact.revenue,
      costs: fact.costs,
      profit: fact.profit,
    });
    return { stages, summary };
  }
}
