// © 2026 Bigfin
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { FinancialModelApplication } from './FinancialModel.application';
import { FinancialOverviewQueryDto } from './dtos/FinancialModel.dto';

@Controller('financial-model')
@ApiTags('FinancialModel')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class FinancialModelController {
  constructor(private readonly application: FinancialModelApplication) {}

  @Get('overview')
  @ApiOperation({ summary: 'Обзор финмодели: маржа, выручка на сотрудника, маржа во времени.' })
  getOverview(@Query() query: FinancialOverviewQueryDto) {
    return this.application.getOverview(query);
  }
}
