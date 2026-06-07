// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { CommandCostAllocationValidatorService } from './CommandCostAllocationValidator.service';
import { EditCostAllocationRuleDto } from '../dtos/CostAllocationRule.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditCostAllocationRuleService {
  constructor(
    private readonly validator: CommandCostAllocationValidatorService,
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
  ) {}

  public async edit(id: number, dto: EditCostAllocationRuleDto) {
    const existing = await this.ruleModel().query().findById(id);
    if (!existing) throw new ServiceError(ERRORS.RULE_NOT_FOUND);
    await this.validator.validate(dto as any);
    return this.ruleModel().query().patchAndFetchById(id, dto as any);
  }
}
