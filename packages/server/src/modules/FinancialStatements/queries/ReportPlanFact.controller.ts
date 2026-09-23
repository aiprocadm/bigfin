// © 2026 Bigfin
import { RequireApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import {
  GetReportPlanFactService,
  PlanFactReportKind,
} from './GetReportPlanFact.service';
import { ReportPlanFactQueryDto } from './ReportPlanFactQuery.dto';

/**
 * План по строкам отчёта (этап 4 ТЗ, п. 4.4).
 *
 * Отдельная лёгкая ручка: отчёт и так тяжёлый, а план нужен не всегда —
 * без заведённого бюджета колонок нет вовсе.
 */
@ApiTags('Financial Reports')
// Отчёт открыт токену API с правом reports:read (FT-091 ТЗ-3).
@RequireApiScope('reports:read')
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
  getPlanFact(@Query() query: ReportPlanFactQueryDto) {
    const kind: PlanFactReportKind =
      query.report === 'cash_flow' ? 'cash_flow' : 'profit_loss';

    // Метод учёта передаём дальше: факт в колонке «Отклонение» обязан
    // считаться так же, как считает сам отчёт (остаток О4 ТЗ).
    return this.planFact.getPlanFact(kind, query.from, query.to, query.basis);
  }
}
