// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetCostAllocationRulesService } from './queries/GetCostAllocationRules.service';
import { GetDealAllocationService } from './queries/GetDealAllocation.service';
import { CreateCostAllocationRuleService } from './commands/CreateCostAllocationRule.service';
import { EditCostAllocationRuleService } from './commands/EditCostAllocationRule.service';
import { DeleteCostAllocationRuleService } from './commands/DeleteCostAllocationRule.service';
import { CreateCostAllocationRuleDto } from './dtos/CostAllocationRule.dto';
import { EditCostAllocationRuleDto } from './dtos/CostAllocationRule.dto';
import { GetRulesQueryDto } from './dtos/GetRulesQuery.dto';

@Injectable()
export class CostAllocationApplication {
  constructor(
    private readonly listService: GetCostAllocationRulesService,
    private readonly allocationService: GetDealAllocationService,
    private readonly createService: CreateCostAllocationRuleService,
    private readonly editService: EditCostAllocationRuleService,
    private readonly deleteService: DeleteCostAllocationRuleService,
  ) {}

  public getRules(query: GetRulesQueryDto) {
    return this.listService.getRules(query);
  }

  public createRule(dto: CreateCostAllocationRuleDto) {
    return this.createService.create(dto);
  }

  public editRule(id: number, dto: EditCostAllocationRuleDto) {
    return this.editService.edit(id, dto);
  }

  public deleteRule(id: number) {
    return this.deleteService.delete(id);
  }

  public getDealAllocation(
    dealId: number,
    period: { fromDate?: string; toDate?: string },
  ) {
    return this.allocationService.getForDeal(dealId, period);
  }
}
