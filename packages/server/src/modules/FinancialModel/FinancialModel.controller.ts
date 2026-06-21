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
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { FinancialModelApplication } from './FinancialModel.application';
import {
  FinancialOverviewQueryDto,
  CreateMarketingChannelDto,
  UpdateMarketingChannelDto,
  UpsertMarketingMonthlyDto,
  SetCustomerLifetimeDto,
} from './dtos/FinancialModel.dto';

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

  @Get('segments')
  @ApiOperation({
    summary:
      'Рентабельность по сегментам: сделки, менеджеры, направления, продукты.',
  })
  getSegments(@Query() query: FinancialOverviewQueryDto) {
    return this.application.getSegments(query);
  }

  @Get('marketing')
  @ApiOperation({ summary: 'Маркетинговые метрики: CAC, ROMI, LTV (по каналам и итого).' })
  getMarketing(@Query() query: FinancialOverviewQueryDto) {
    return this.application.getMarketingMetrics(query);
  }

  @Get('marketing/channels')
  @ApiOperation({ summary: 'Список каналов привлечения.' })
  listChannels() {
    return this.application.listChannels();
  }

  @Post('marketing/channels')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Создать канал привлечения.' })
  createChannel(@Body() dto: CreateMarketingChannelDto) {
    return this.application.createChannel(dto);
  }

  @Put('marketing/channels/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Изменить канал привлечения (название/активность).' })
  updateChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingChannelDto,
  ) {
    return this.application.updateChannel(id, dto);
  }

  @Delete('marketing/channels/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Удалить канал привлечения.' })
  deleteChannel(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteChannel(id);
  }

  @Put('marketing/monthly')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Сохранить помесячные расход и новых клиентов по каналу.' })
  upsertMonthly(@Body() dto: UpsertMarketingMonthlyDto) {
    return this.application.upsertMonthly(dto);
  }

  @Put('marketing/lifetime')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Задать средний срок жизни клиента (мес.) для LTV.' })
  setCustomerLifetime(@Body() dto: SetCustomerLifetimeDto) {
    return this.application.setCustomerLifetime(dto.months);
  }
}
