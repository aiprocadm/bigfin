// © 2026 Bigfin
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';

@Controller('debts')
@ApiTags('Debts')
@ApiCommonHeaders()
export class DebtsController {
  constructor(private readonly application: DebtsApplication) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Debts overview: AR/AP totals, aging buckets, top debtors.',
  })
  getOverview(@Query() query: GetDebtsOverviewQueryDto) {
    return this.application.getOverview(query);
  }
}
