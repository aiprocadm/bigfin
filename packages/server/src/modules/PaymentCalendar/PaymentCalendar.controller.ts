import { RequireApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
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
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { GetAccountsCashGapsService } from './queries/GetAccountsCashGaps.service';
import { PaymentCalendarApplication } from './PaymentCalendar.application';
import {
  CreatePlannedOperationDto,
  EditPlannedOperationDto,
  MaterializePlannedOperationDto,
} from './dtos/PlannedOperation.dto';
import { GetPlannedOperationsQueryDto } from './dtos/GetPlannedOperationsQuery.dto';
import { GetPaymentCalendarQueryDto } from './dtos/GetPaymentCalendarQuery.dto';
import {
  CalendarMatrixQueryDto,
  GapScenariosQueryDto,
  ReschedulePlannedOperationDto,
  WhatIfDto,
} from './dtos/PlanningScenarios.dto';
import { GetCalendarMatrixService } from './queries/GetCalendarMatrix.service';
import { GapScenariosService } from './queries/GapScenarios.service';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { RequireFeature } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';

/**
 * Плановая операция — это будущее движение денег, поэтому предмет тот же, что
 * у банковских операций.
 */
@Controller('payment-calendar')
@ApiTags('Payment Calendar')
@ApiCommonHeaders()
@UseGuards(FeatureGuard, AuthorizationGuard, PermissionGuard)
@RequireFeature(Features.PAYMENT_CALENDAR)
export class PaymentCalendarController {
  constructor(
    private readonly application: PaymentCalendarApplication,
    private readonly tenancyContext: TenancyContext,
    private readonly accountsCashGaps: GetAccountsCashGapsService,
    private readonly calendarMatrix: GetCalendarMatrixService,
    private readonly gapScenarios: GapScenariosService,
  ) {}

  private async tenantId(): Promise<number> {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    return metadata?.tenantId;
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('matrix')
  @ApiOperation({ summary: 'Календарь матрицей «план / факт» с накопительным плановым остатком (FT-050).' })
  @RequireApiScope('reports:read')
  async getMatrix(@Query() query: CalendarMatrixQueryDto) {
    return this.calendarMatrix.matrix(await this.tenantId(), {
      fromDate: query.fromDate,
      toDate: query.toDate,
      granularity: (query.granularity ?? 'month') as any,
      groupBy: (query.groupBy ?? 'articles') as any,
      accountId: query.accountId,
    });
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('gap-scenarios')
  @ApiOperation({ summary: 'Что можно перенести до разрыва и к какому дню он исчезнет (FT-051).' })
  async getGapScenarios(@Query() query: GapScenariosQueryDto) {
    return this.gapScenarios.scenarios(await this.tenantId(), query.horizonDays, query.accountId);
  }

  @Post('what-if')
  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Прогноз после переноса платежей — без сохранения (FT-051).' })
  async whatIf(@Body() body: WhatIfDto) {
    return this.gapScenarios.whatIf(await this.tenantId(), body.moves, body.horizonDays, body.accountId);
  }

  @Post('planned-operations/:id/reschedule')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Перенести разовый план на другую дату (FT-051).' })
  reschedule(@Param('id', ParseIntPipe) id: number, @Body() body: ReschedulePlannedOperationDto) {
    return this.gapScenarios.reschedule(id, body.plannedDate);
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get()
  @ApiOperation({ summary: 'Payment calendar forecast for a horizon.' })
  @RequireApiScope('reports:read')
  async getForecast(@Query() query: GetPaymentCalendarQueryDto) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    return this.application.getForecast(metadata?.tenantId, query);
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('cash-gaps')
  @ApiOperation({
    summary: 'Кассовые разрывы по каждому счёту, с глубиной и датой выхода.',
  })
  @RequireApiScope('reports:read')
  getCashGaps(@Query('horizonDays') horizonDays?: string) {
    return this.accountsCashGaps.getAccountsCashGaps(Number(horizonDays));
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('planned-operations')
  @ApiOperation({ summary: 'List planned operations.' })
  getPlannedOperations(@Query() query: GetPlannedOperationsQueryDto) {
    return this.application.getPlannedOperations(query);
  }

  @Post('planned-operations')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Create a planned operation.' })
  createPlannedOperation(@Body() dto: CreatePlannedOperationDto) {
    return this.application.createPlannedOperation(dto);
  }

  @Post('planned-operations/:id/materialize')
  // Создаёт настоящую денежную операцию — то же право, что и ручное создание.
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({
    summary: 'Materialize a planned operation into a real cashflow transaction.',
  })
  materializePlannedOperation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MaterializePlannedOperationDto,
  ) {
    return this.application.materializePlannedOperation(id, dto);
  }

  @Put('planned-operations/:id')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Edit a planned operation.' })
  editPlannedOperation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditPlannedOperationDto,
  ) {
    return this.application.editPlannedOperation(id, dto);
  }

  @Delete('planned-operations/:id')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Delete a planned operation.' })
  deletePlannedOperation(@Param('id', ParseIntPipe) id: number) {
    return this.application.deletePlannedOperation(id);
  }
}
