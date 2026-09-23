// © 2026 Bigfin
import { RequireApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';
import { GetContactDebtsQueryDto } from './dtos/GetContactDebtsQuery.dto';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { RequireFeature } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';
import {
  CreateRepaymentPlanDto,
  EditRepaymentPlanDto,
} from './dtos/RepaymentPlan.dto';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { RequireAnyPermission } from '@/modules/Roles/RequireAnyPermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { SaleInvoiceAction } from '@/modules/SaleInvoices/SaleInvoice.types';
import {
  CustomerAction,
  VendorAction,
} from '@/modules/Customers/types/Customers.types';

/**
 * План погашения заводится по контрагенту, а он бывает покупателем ИЛИ
 * поставщиком — поэтому пометка «любое из прав». Напоминание же уходит
 * покупателю письмом по конкретному счёту, и право берётся у счёта.
 */
const CONTACT_EDIT = [
  { ability: CustomerAction.Edit, subject: AbilitySubject.Customer },
  { ability: VendorAction.Edit, subject: AbilitySubject.Vendor },
];

@Controller('debts')
@ApiTags('Debts')
@ApiCommonHeaders()
@UseGuards(FeatureGuard, AuthorizationGuard, PermissionGuard)
@RequireFeature(Features.DEBTS)
export class DebtsController {
  constructor(private readonly application: DebtsApplication) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Debts overview: AR/AP totals, aging buckets, top debtors.',
  })
  @RequireApiScope('reports:read')
  getOverview(@Query() query: GetDebtsOverviewQueryDto) {
    return this.application.getOverview(query);
  }

  @Get('contact/:contactId')
  @ApiOperation({ summary: 'Unpaid documents of a contact (drill-down).' })
  @RequireApiScope('reports:read')
  getContactDebts(
    @Param('contactId', ParseIntPipe) contactId: number,
    @Query() query: GetContactDebtsQueryDto,
  ) {
    return this.application.getContactDebts(contactId, query);
  }

  @Post('invoices/:invoiceId/remind')
  // Напоминание уходит покупателю письмом — правило то же, что у остальных
  // писем: это не чтение.
  @RequirePermission(SaleInvoiceAction.Edit, AbilitySubject.SaleInvoice)
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
  @RequireAnyPermission(...CONTACT_EDIT)
  @ApiOperation({ summary: 'Create a repayment plan.' })
  createRepaymentPlan(@Body() dto: CreateRepaymentPlanDto) {
    return this.application.createRepaymentPlan(dto);
  }

  @Put('repayment-plans/:id')
  @RequireAnyPermission(...CONTACT_EDIT)
  @ApiOperation({ summary: 'Edit a repayment plan.' })
  editRepaymentPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditRepaymentPlanDto,
  ) {
    return this.application.editRepaymentPlan(id, dto);
  }

  @Delete('repayment-plans/:id')
  @RequireAnyPermission(...CONTACT_EDIT)
  @ApiOperation({ summary: 'Delete a repayment plan.' })
  deleteRepaymentPlan(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteRepaymentPlan(id);
  }

  @Post('repayment-plans/:planId/installments/:installmentId/pay')
  @RequireAnyPermission(...CONTACT_EDIT)
  @ApiOperation({ summary: 'Mark an installment as paid.' })
  markInstallmentPaid(
    @Param('planId', ParseIntPipe) planId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
  ) {
    return this.application.markInstallmentPaid(planId, installmentId);
  }
}
