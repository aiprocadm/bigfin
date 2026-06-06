// © 2026 Bigfin
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PaymentRequestsApplication } from './PaymentRequests.application';
import { CreatePaymentRequestDto } from './dtos/PaymentRequest.dto';
import { GetPaymentRequestsQueryDto } from './dtos/GetPaymentRequestsQuery.dto';

@Controller('payment-requests')
@ApiTags('Payment Requests')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class PaymentRequestsController {
  constructor(private readonly application: PaymentRequestsApplication) {}

  @Get()
  @ApiOperation({ summary: 'List payment requests (filter by status).' })
  getList(@Query() query: GetPaymentRequestsQueryDto) {
    return this.application.getPaymentRequests(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment request.' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.application.getPaymentRequest(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a payment request (status pending).' })
  create(@Body() dto: CreatePaymentRequestDto) {
    return this.application.createPaymentRequest(dto);
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
    summary: 'Cancel a payment request (also cancels its planned outflow).',
  })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.application.cancelPaymentRequest(id);
  }
}
