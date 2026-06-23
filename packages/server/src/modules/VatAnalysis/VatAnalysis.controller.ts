import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetVatSummaryService } from './GetVatSummary.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

@Controller('vat-analysis')
@ApiTags('vat-analysis')
export class VatAnalysisController {
  constructor(
    private readonly getVatSummary: GetVatSummaryService,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Сводка по НДС за период (начислен/к вычету/к уплате).' })
  async summary(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const enabled = await this.featuresManager.accessible(
      Features.VAT_ANALYSIS,
    );
    if (!enabled) throw new ForbiddenException('Анализ НДС выключен');

    return this.getVatSummary.getSummary(fromDate, toDate);
  }
}
