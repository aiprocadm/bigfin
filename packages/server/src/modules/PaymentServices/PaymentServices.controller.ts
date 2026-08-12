import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentServicesApplication } from './PaymentServicesApplication';
import { EditPaymentMethodDTO } from './types';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';

/**
 * Способы оплаты счетов — настройка приёма денег снаружи, поэтому право то же,
 * что у подключения эквайринга.
 */
@ApiTags('Payment Services')
@Controller('payment-services')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class PaymentServicesController {
  constructor(
    private readonly paymentServicesApp: PaymentServicesApplication,
  ) {}

  @Get('/')
  async getPaymentServicesSpecificInvoice() {
    const paymentServices =
      await this.paymentServicesApp.getPaymentServicesForInvoice();

    return { paymentServices };
  }

  @Get('/state')
  async getPaymentMethodsState() {
    const paymentMethodsState =
      await this.paymentServicesApp.getPaymentMethodsState();

    return { data: paymentMethodsState };
  }

  @Get('/:paymentServiceId')
  async getPaymentService(@Param('paymentServiceId') paymentServiceId: number) {
    const paymentService =
      await this.paymentServicesApp.getPaymentService(paymentServiceId);

    return { data: paymentService };
  }

  @Post('/:paymentMethodId')
  @RequirePermission('manage', 'all')
  @HttpCode(200)
  async updatePaymentMethod(
    @Param('paymentMethodId') paymentMethodId: number,
    @Body() updatePaymentMethodDTO: EditPaymentMethodDTO,
  ) {
    await this.paymentServicesApp.editPaymentMethod(
      paymentMethodId,
      updatePaymentMethodDTO,
    );
    return {
      id: paymentMethodId,
      message: 'The given payment method has been updated.',
    };
  }

  @Delete('/:paymentMethodId')
  @RequirePermission('manage', 'all')
  @HttpCode(200)
  async deletePaymentMethod(@Param('paymentMethodId') paymentMethodId: number) {
    await this.paymentServicesApp.deletePaymentMethod(paymentMethodId);

    return {
      id: paymentMethodId,
      message: 'The payment method has been deleted.',
    };
  }
}
