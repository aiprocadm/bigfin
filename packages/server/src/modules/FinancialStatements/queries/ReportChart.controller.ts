// © 2026 Bigfin
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import {
  GetReportChartService,
  ReportChartKind,
} from './GetReportChart.service';
import { GetReportDrillDownService } from './GetReportDrillDown.service';
import {
  AccountDateRangeQueryDto,
  ReportDateRangeQueryDto,
} from '@/common/dtos/DateRangeQuery.dto';

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
  constructor(
    private readonly reportChart: GetReportChartService,
    private readonly drillDown: GetReportDrillDownService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Ряды графика отчёта по месяцам.' })
  @ApiResponse({
    status: 200,
    description:
      'ОПиУ: выручка и прибыль. ДДС: поступления и выплаты по денежным счетам.',
  })
  getChart(@Query() query: ReportDateRangeQueryDto) {
    const kind: ReportChartKind =
      query.report === 'cash_flow' ? 'cash_flow' : 'profit_loss';

    return this.reportChart.getChart(kind, query.from, query.to);
  }

  @Get('drill-down')
  @ApiOperation({
    summary: 'Операции, из которых сложилась сумма отчёта.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Итог списка совпадает с суммой в отчёте: вклад строки считается тем ' +
      'же правилом стороны счёта, что и в самом отчёте.',
  })
  getDrillDown(@Query() query: AccountDateRangeQueryDto) {
    return this.drillDown.getDrillDown(
      query.accountId,
      query.from,
      query.to,
    );
  }
}
