// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { CommandCostAllocationValidatorService } from './CommandCostAllocationValidator.service';
import { CreateCostAllocationRuleDto } from '../dtos/CostAllocationRule.dto';

@Injectable()
export class CreateCostAllocationRuleService {
  constructor(
    private readonly validator: CommandCostAllocationValidatorService,
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
  ) {}

  public async create(dto: CreateCostAllocationRuleDto) {
    await this.validator.validate(dto as any);
    return this.ruleModel().query().insertAndFetch(dto as any);
  }
}
