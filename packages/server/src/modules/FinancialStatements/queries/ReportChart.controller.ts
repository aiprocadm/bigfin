// © 2026 Bigfin
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import {
  GetReportChartService,
  ReportChartKind,
} from './GetReportChart.service';

/**
 * Ряды графика над таблицей отчёта (этап 4 ТЗ, п. 4.2).
 *
 * Отдельная лёгкая ручка: сам отчёт тяжёлый, и грузить его целиком ради
 * двенадцати столбцов незачем.
 */
@ApiTags('Financial Reports')
@Controller('financial-reports/chart')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard)
export class ReportChartController {
  constructor(private readonly reportChart: GetReportChartService) {}

  @Get()
  @ApiOperation({ summary: 'Ряды графика отчёта по месяцам.' })
  @ApiResponse({
    status: 200,
    description:
      'ОПиУ: выручка и прибыль. ДДС: поступления и выплаты по денежным счетам.',
  })
  getChart(
    @Query('report') report: ReportChartKind,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const kind: ReportChartKind =
      report === 'cash_flow' ? 'cash_flow' : 'profit_loss';

    return this.reportChart.getChart(kind, from, to);
  }
}
