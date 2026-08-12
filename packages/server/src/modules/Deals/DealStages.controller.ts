// © 2026 Bigfin
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { DealStagesApplication } from './DealStages.application';
import {
  CreateDealStageDto,
  EditDealStageDto,
  GetDealStagesQueryDto,
} from './dtos/DealStage.dto';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { SaleEstimateAction } from '@/modules/SaleEstimates/types/SaleEstimates.types';

/**
 * Этапы живут внутри своей сделки, поэтому любая правка этапов — это правка
 * сделки, и право одно и то же.
 */
@Controller('deals/:dealId/stages')
@ApiTags('Deals')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class DealStagesController {
  constructor(private readonly application: DealStagesApplication) {}

  @Get()
  @ApiOperation({ summary: 'List a deal\'s stages with recognition summary.' })
  list(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Query() query: GetDealStagesQueryDto,
  ) {
    return this.application.list(dealId, {
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
  }

  @Post()
  @RequirePermission(SaleEstimateAction.Edit, AbilitySubject.SaleEstimate)
  @ApiOperation({ summary: 'Add a stage to a deal.' })
  create(@Param('dealId', ParseIntPipe) dealId: number, @Body() dto: CreateDealStageDto) {
    return this.application.create(dealId, dto);
  }

  @Put(':stageId')
  @RequirePermission(SaleEstimateAction.Edit, AbilitySubject.SaleEstimate)
  @ApiOperation({ summary: 'Edit a deal stage.' })
  edit(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: EditDealStageDto,
  ) {
    return this.application.edit(dealId, stageId, dto);
  }

  @Delete(':stageId')
  @RequirePermission(SaleEstimateAction.Edit, AbilitySubject.SaleEstimate)
  @ApiOperation({ summary: 'Delete a deal stage.' })
  remove(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.application.remove(dealId, stageId);
  }
}
