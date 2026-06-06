// © 2026 Bigfin
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';
import { GetContactDebtsQueryDto } from './dtos/GetContactDebtsQuery.dto';

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

  @Get('contact/:contactId')
  @ApiOperation({ summary: 'Unpaid documents of a contact (drill-down).' })
  getContactDebts(
    @Param('contactId', ParseIntPipe) contactId: number,
    @Query() query: GetContactDebtsQueryDto,
  ) {
    return this.application.getContactDebts(contactId, query);
  }

  @Post('invoices/:invoiceId/remind')
  @ApiOperation({
    summary: 'Send a payment reminder to the debtor (reuses invoice email).',
  })
  remind(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return this.application.remindDebtor(invoiceId);
  }
}
