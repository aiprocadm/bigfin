import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './Dashboard.service';
import { GetMoneySummaryService } from './queries/GetMoneySummary.service';
import { GetDashboardOverviewService } from './queries/GetDashboardOverview.service';
import { GetMoneyWidgetService } from './queries/GetMoneyWidget.service';
import { GetDashboardBootMetaResponseDto } from './dtos/GetDashboardBootMetaResponse.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthorizationGuard, PermissionGuard)
@ApiExtraModels(GetDashboardBootMetaResponseDto)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly moneySummaryService: GetMoneySummaryService,
    private readonly overviewService: GetDashboardOverviewService,
    private readonly moneyWidgetService: GetMoneyWidgetService,
  ) {}

  @ApiOperation({
    summary:
      'Виджет денег в шапке: остаток, ближайший разрыв, линия за месяц.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Одна ручка на весь виджет: шапка есть на каждом экране, и три ' +
      'запроса на каждом переходе — это три запроса на каждый щелчок.',
  })
  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('money-widget')
  getMoneyWidget() {
    return this.moneyWidgetService.getMoneyWidget();
  }

  @ApiOperation({ summary: 'Get dashboard boot metadata' })
  @ApiResponse({
    status: 200,
    description: 'The dashboard details have been successfully retrieved.',
    schema: { $ref: getSchemaPath(GetDashboardBootMetaResponseDto) },
  })
  // Загрузка витрины открыта намеренно: по ней интерфейс узнаёт, что
  // пользователю можно. Закрыть её правом — не пустить никого, кроме
  // владельцев этого права.
  @Get('boot')
  getBootMeta() {
    return this.dashboardService.getBootMeta();
  }

  @ApiOperation({
    summary:
      'Сводка «как дела с деньгами» для главной: остатки, долги нам и наши.',
  })
  @ApiResponse({
    status: 200,
    description: 'Суммы приходят числом и читаемой записью в валюте организации.',
  })
  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('money-summary')
  getMoneySummary() {
    return this.moneySummaryService.getMoneySummary();
  }

  @ApiOperation({
    summary:
      'Всё для главной одним ответом: показатели, ряды графика, остатки по ' +
      'счетам и топ статей расходов.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Доходы, расходы и прибыль берутся из отчёта о прибылях и убытках — ' +
      'суммы совпадают с разделом «Отчёты».',
  })
  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('overview')
  getOverview(
    @Query('from') from?: string,
    @Query('to') to?: string,
    // Порядок направлений: по прибыли или по рентабельности. Это два разных
    // вопроса, и переключатель на главной меняет именно его.
    @Query('directionsSortBy') directionsSortBy?: string,
  ) {
    // Пять отдельных запросов на главной недопустимы (п. 2.3 ТЗ).
    return this.overviewService.getOverview(
      from,
      to,
      directionsSortBy === 'margin' ? 'margin' : 'profit',
    );
  }
}
