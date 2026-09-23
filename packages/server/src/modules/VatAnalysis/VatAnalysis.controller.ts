import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetVatSummaryService } from './GetVatSummary.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { DateRangeDatesQueryDto } from '@/common/dtos/DateRangeQuery.dto';

@Controller('vat-analysis')
@UseGuards(AuthorizationGuard, PermissionGuard)
@ApiTags('vat-analysis')
export class VatAnalysisController {
  constructor(
    private readonly getVatSummary: GetVatSummaryService,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @RequirePermission('read-sales-tax-liability-summary', AbilitySubject.Report)
  @Get()
  @ApiOperation({ summary: 'Сводка по НДС за период (начислен/к вычету/к уплате).' })
  async summary(@Query() query: DateRangeDatesQueryDto) {
    const enabled = await this.featuresManager.accessible(
      Features.VAT_ANALYSIS,
    );
    if (!enabled) throw new ForbiddenException('Анализ НДС выключен');

    return this.getVatSummary.getSummary(query.fromDate, query.toDate);
  }
}
