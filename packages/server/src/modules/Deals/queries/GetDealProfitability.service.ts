// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { computeDealMargin } from '../utils/computeDealMargin';
import { ERRORS } from '../constants';
import { DealProfitability } from '../Deals.interfaces';

@Injectable()
export class GetDealProfitabilityService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async getProfitability(
    dealId: number,
    query: { fromDate?: string; toDate?: string },
  ): Promise<DealProfitability> {
    const deal = await this.dealModel().query().findById(dealId);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);

    const rows = await this.rollup.getRollup({
      projectId: dealId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    } as any);

    const margin = computeDealMargin(rows as any);
    return { dealId, ...margin, articles: rows as any };
  }
}
