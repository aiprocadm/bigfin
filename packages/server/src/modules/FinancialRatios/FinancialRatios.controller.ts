import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetFinancialRatiosService } from './GetFinancialRatios.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

@Controller('financial-ratios')
@ApiTags('financial-ratios')
export class FinancialRatiosController {
  constructor(
    private readonly getRatios: GetFinancialRatiosService,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Финансовые коэффициенты + вертикальный анализ ОПиУ.' })
  async ratios(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const enabled = await this.featuresManager.accessible(
      Features.FINANCIAL_RATIOS,
    );
    if (!enabled) throw new ForbiddenException('Показатели выключены');

    return this.getRatios.getRatios(fromDate, toDate);
  }
}
