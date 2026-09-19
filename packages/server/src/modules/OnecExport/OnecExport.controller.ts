import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetOnecExportService } from './GetOnecExport.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { AccountDateRangeQueryDto } from '@/common/dtos/DateRangeQuery.dto';

@Controller('onec-export')
@ApiTags('onec-export')
export class OnecExportController {
  constructor(
    private readonly getExport: GetOnecExportService,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="1c_export.txt"')
  @ApiOperation({ summary: 'Выгрузка операций в формате 1CClientBankExchange.' })
  async export(
    @Query() query: AccountDateRangeQueryDto,
  ): Promise<string> {
    const enabled = await this.featuresManager.accessible(Features.ONEC_EXPORT);
    if (!enabled) throw new ForbiddenException('Выгрузка в 1С выключена');

    return this.getExport.export(query.accountId, query.from, query.to);
  }
}
