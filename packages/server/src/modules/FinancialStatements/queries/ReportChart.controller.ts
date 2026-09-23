// © 2026 Bigfin
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { RequireAnyPermission } from '@/modules/Roles/RequireAnyPermission.decorator';
import { RequireApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import {
  GetReportChartService,
  ReportChartKind,
} from './GetReportChart.service';
import { GetReportDrillDownService } from './GetReportDrillDown.service';
import { GetBalanceStructureService } from './GetBalanceStructure.service';
import {
  AccountDateRangeQueryDto,
  DateRangeQueryDto,
  ReportDateRangeQueryDto,
} from '@/common/dtos/DateRangeQuery.dto';
import { DrillDownQueryDto } from './DrillDownQuery.dto';

/**
 * Ряды графика над таблицей отчёта (этап 4 ТЗ, п. 4.2).
 *
 * Отдельная лёгкая ручка: сам отчёт тяжёлый, и грузить его целиком ради
 * двенадцати столбцов незачем.
 */
@ApiTags('Financial Reports')
// Отчёт открыт токену API с правом reports:read (FT-091 ТЗ-3).
@RequireApiScope('reports:read')
@Controller('financial-reports/chart')
@UseGuards(AuthorizationGuard, PermissionGuard)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard)
export class ReportChartController {
  constructor(
    private readonly reportChart: GetReportChartService,
    private readonly drillDown: GetReportDrillDownService,
    private readonly balanceStructure: GetBalanceStructureService,
  ) {}

  @RequireAnyPermission({ ability: 'read-profit-loss', subject: AbilitySubject.Report }, { ability: 'read-cashflow-articles', subject: AbilitySubject.Report }, { ability: 'read-managerial-profit-loss', subject: AbilitySubject.Report })
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

  @RequireAnyPermission({ ability: 'read-profit-loss', subject: AbilitySubject.Report }, { ability: 'read-cashflow-articles', subject: AbilitySubject.Report }, { ability: 'read-managerial-profit-loss', subject: AbilitySubject.Report })
  @Get('structure')
  @ApiOperation({ summary: 'Структура баланса: имущество и его источники.' })
  @ApiResponse({
    status: 200,
    description:
      'Две половины баланса, разложенные по группам второго уровня. ' +
      'Отрицательные группы возвращаются с нулевой долей: ширины у них нет, ' +
      'но прятать их нельзя — сумма перестала бы сходиться с таблицей.',
  })
  getStructure(@Query() query: DateRangeQueryDto) {
    return this.balanceStructure.getStructure(query.from, query.to);
  }

  @RequireAnyPermission({ ability: 'read-profit-loss', subject: AbilitySubject.Report }, { ability: 'read-cashflow-articles', subject: AbilitySubject.Report }, { ability: 'read-managerial-profit-loss', subject: AbilitySubject.Report })
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
  getDrillDown(@Query() query: DrillDownQueryDto) {
    // Статья важнее счёта, когда пришли оба: человек щёлкнул по строке
    // отчёта, а строка отчёта — это статья.
    const scope = {
      branchesIds: query.branchesIds,
      legalEntityIds: query.legalEntityIds,
      projectsIds: query.projectsIds,
      reportFrom: query.reportFrom,
      reportTo: query.reportTo,
      basis: query.basis,
      plType: query.plType,
    };

    // Ярус целиком (строка группы управленческого ОПиУ, FT-010).
    if (query.plType !== undefined && query.articleId === undefined) {
      return this.drillDown.getDrillDownByPlType(
        query.plType,
        query.from,
        query.to,
        scope,
      );
    }

    if (query.articleId !== undefined) {
      return this.drillDown.getDrillDownByArticle(
        query.articleId,
        query.from,
        query.to,
        scope,
      );
    }

    return this.drillDown.getDrillDown(
      query.accountId as number,
      query.from,
      query.to,
    );
  }
}
