// © 2026 Bigfin
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import {
  GetReportPlanFactService,
  PlanFactReportKind,
} from './GetReportPlanFact.service';
import { ReportDateRangeQueryDto } from '@/common/dtos/DateRangeQuery.dto';

/**
 * План по строкам отчёта (этап 4 ТЗ, п. 4.4).
 *
 * Отдельная лёгкая ручка: отчёт и так тяжёлый, а план нужен не всегда —
 * без заведённого бюджета колонок нет вовсе.
 */
@ApiTags('Financial Reports')
@Controller('financial-reports/plan-fact')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard)
export class ReportPlanFactController {
  constructor(private readonly planFact: GetReportPlanFactService) {}

  @Get()
  @ApiOperation({ summary: 'План по счетам отчёта за период.' })
  @ApiResponse({
    status: 200,
    description:
      'Если бюджета на год нет — available: false, и отчёт рисуется как ' +
      'раньше. План статьи попадает на строку счёта, только когда счёт у ' +
      'статьи единственный; иначе он виден лишь в итоге по виду.',
  })
  getPlanFact(@Query() query: ReportDateRangeQueryDto) {
    const kind: PlanFactReportKind =
      query.report === 'cash_flow' ? 'cash_flow' : 'profit_loss';

    return this.planFact.getPlanFact(kind, query.from, query.to);
  }
}
