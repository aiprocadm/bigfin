// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { FixedAssetsApplication } from './FixedAssets.application';
import {
  AccrueMonthDto,
  CreateFixedAssetDto,
  DisposeFixedAssetDto,
} from './dtos/FixedAsset.dto';

@Controller('fixed-assets')
@ApiTags('Fixed Assets')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class FixedAssetsController {
  constructor(private readonly application: FixedAssetsApplication) {}

  @Get('summary')
  @ApiOperation({ summary: 'Fixed assets summary: gross, accumulated, net.' })
  getSummary() {
    return this.application.getSummary();
  }

  @Get()
  @ApiOperation({ summary: 'List fixed assets with net value.' })
  getFixedAssets() {
    return this.application.getFixedAssets();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fixed asset with its depreciation schedule.' })
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.application.getDetail(id);
  }

  @Post()
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Register a fixed asset and build schedule (admin only).' })
  create(@Body() dto: CreateFixedAssetDto) {
    return this.application.createFixedAsset(dto);
  }

  @Post('accrue')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Accrue depreciation for a month (idempotent, admin only).' })
  accrue(@Body() dto: AccrueMonthDto) {
    return this.application.accrueMonth(dto.period);
  }

  @Post(':id/dispose')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Dispose/write-off a fixed asset (admin only).' })
  dispose(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DisposeFixedAssetDto,
  ) {
    return this.application.disposeFixedAsset(id, dto);
  }

  @Delete(':id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete a fixed asset and revert its GL (admin only).' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteFixedAsset(id);
  }
}
