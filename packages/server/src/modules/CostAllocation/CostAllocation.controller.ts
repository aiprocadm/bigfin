// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { CostAllocationApplication } from './CostAllocation.application';
import { CreateCostAllocationRuleDto, EditCostAllocationRuleDto } from './dtos/CostAllocationRule.dto';
import { GetRulesQueryDto } from './dtos/GetRulesQuery.dto';

@Controller('cost-allocation-rules')
@ApiTags('Cost Allocation')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class CostAllocationController {
  constructor(private readonly application: CostAllocationApplication) {}

  @Get()
  @ApiOperation({ summary: 'List cost allocation rules.' })
  getList(@Query() query: GetRulesQueryDto) {
    return this.application.getRules(query);
  }

  @Post()
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Create a cost allocation rule (admin only).' })
  create(@Body() dto: CreateCostAllocationRuleDto) {
    return this.application.createRule(dto);
  }

  @Put(':id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Edit a cost allocation rule (admin only).' })
  edit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditCostAllocationRuleDto,
  ) {
    return this.application.editRule(id, dto);
  }

  @Delete(':id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete a cost allocation rule (admin only).' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteRule(id);
  }
}
