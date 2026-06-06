// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';
import { GetContactDebtsQueryDto } from './dtos/GetContactDebtsQuery.dto';
import {
  CreateRepaymentPlanDto,
  EditRepaymentPlanDto,
} from './dtos/RepaymentPlan.dto';

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

  @Get('repayment-plans')
  @ApiOperation({ summary: 'List repayment plans with progress.' })
  getRepaymentPlans(
    @Query('side') side?: string,
    @Query('contactId') contactId?: string,
  ) {
    return this.application.getRepaymentPlans({
      side,
      contactId: contactId ? Number(contactId) : undefined,
    });
  }

  @Post('repayment-plans')
  @ApiOperation({ summary: 'Create a repayment plan.' })
  createRepaymentPlan(@Body() dto: CreateRepaymentPlanDto) {
    return this.application.createRepaymentPlan(dto);
  }

  @Put('repayment-plans/:id')
  @ApiOperation({ summary: 'Edit a repayment plan.' })
  editRepaymentPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditRepaymentPlanDto,
  ) {
    return this.application.editRepaymentPlan(id, dto);
  }

  @Delete('repayment-plans/:id')
  @ApiOperation({ summary: 'Delete a repayment plan.' })
  deleteRepaymentPlan(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteRepaymentPlan(id);
  }

  @Post('repayment-plans/:planId/installments/:installmentId/pay')
  @ApiOperation({ summary: 'Mark an installment as paid.' })
  markInstallmentPaid(
    @Param('planId', ParseIntPipe) planId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
  ) {
    return this.application.markInstallmentPaid(planId, installmentId);
  }
}
