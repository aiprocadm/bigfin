// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteCostAllocationRuleService {
  constructor(
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
  ) {}

  public async delete(id: number) {
    const deleted = await this.ruleModel().query().deleteById(id);
    if (!deleted) throw new ServiceError(ERRORS.RULE_NOT_FOUND);
  }
}
