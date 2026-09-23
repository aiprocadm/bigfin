// © 2026 Bigfin
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject, PaymentRequestAction } from '@/modules/Roles/Roles.types';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PaymentRequestsApplication } from './PaymentRequests.application';
import { CreatePaymentRequestDto, EditPaymentRequestDto } from './dtos/PaymentRequest.dto';
import { GetPaymentRequestsQueryDto } from './dtos/GetPaymentRequestsQuery.dto';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { RequireFeature } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';

/**
 * Видит ли человек только свои заявки (FT-083 ТЗ-3): да, если роль не дала
 * права «видеть заявки всех сотрудников». Владельцу («можно всё») видно всё.
 */
export function onlyOwnRequests(request: any): boolean {
  const ability = request?.ability;
  if (!ability) return true;
  return !ability.can(PaymentRequestAction.ViewAll, AbilitySubject.PaymentRequest);
}

@Controller('payment-requests')
@ApiTags('Payment Requests')
@ApiCommonHeaders()
@UseGuards(FeatureGuard, AuthorizationGuard, PermissionGuard)
@RequireFeature(Features.PAYMENT_REQUESTS)
export class PaymentRequestsController {
  constructor(private readonly application: PaymentRequestsApplication) {}

  @Get()
  @ApiOperation({ summary: 'List payment requests (filter by status).' })
  getList(@Query() query: GetPaymentRequestsQueryDto, @Req() request: any) {
    return this.application.getPaymentRequests(query, onlyOwnRequests(request));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment request.' })
  get(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    return this.application.getPaymentRequest(id, onlyOwnRequests(request));
  }

  @Post()
  @ApiOperation({ summary: 'Create a payment request (status pending).' })
  create(@Body() dto: CreatePaymentRequestDto) {
    return this.application.createPaymentRequest(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit a draft payment request (author only).' })
  edit(@Param('id', ParseIntPipe) id: number, @Body() dto: EditPaymentRequestDto) {
    return this.application.editPaymentRequest(id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a draft payment request for approval (author only).' })
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.application.submitPaymentRequest(id);
  }

  @Post(':id/approve')
  @RequirePermission('manage', 'all')
  @ApiOperation({
    summary: 'Approve a request → planned outflow in the calendar (admin only).',
  })
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.application.approvePaymentRequest(id);
  }

  @Post(':id/reject')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Reject a payment request (admin only).' })
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.application.rejectPaymentRequest(id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary:
      'Cancel a payment request (author or admin; also cancels its planned outflow).',
  })
  cancel(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    // Отменяет автор заявки — или тот, кто заявки одобряет. Права здесь
    // недостаточно: важно, чья это заявка, а не что человеку доверено вообще.
    const canManageAll = request?.ability?.can('manage', 'all') ?? false;

    return this.application.cancelPaymentRequest(id, canManageAll);
  }
}
