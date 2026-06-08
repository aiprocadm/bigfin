// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';

@Injectable()
export class GetCostAllocationRulesService {
  constructor(
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
  ) {}

  public getRules(query: { activeOnly?: string }) {
    return this.ruleModel()
      .query()
      .modify((qb) => {
        if (query.activeOnly === 'true') qb.where('isActive', true);
      })
      .orderBy('id', 'desc');
  }
}
