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
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { PaymentCalendarApplication } from './PaymentCalendar.application';
import {
  CreatePlannedOperationDto,
  EditPlannedOperationDto,
  MaterializePlannedOperationDto,
} from './dtos/PlannedOperation.dto';
import { GetPlannedOperationsQueryDto } from './dtos/GetPlannedOperationsQuery.dto';
import { GetPaymentCalendarQueryDto } from './dtos/GetPaymentCalendarQuery.dto';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { RequireFeature } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';

/**
 * Плановая операция — это будущее движение денег, поэтому предмет тот же, что
 * у банковских операций.
 */
@Controller('payment-calendar')
@ApiTags('Payment Calendar')
@ApiCommonHeaders()
@UseGuards(FeatureGuard, AuthorizationGuard, PermissionGuard)
@RequireFeature(Features.PAYMENT_CALENDAR)
export class PaymentCalendarController {
  constructor(
    private readonly application: PaymentCalendarApplication,
    private readonly tenancyContext: TenancyContext,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Payment calendar forecast for a horizon.' })
  async getForecast(@Query() query: GetPaymentCalendarQueryDto) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    return this.application.getForecast(metadata?.tenantId, query);
  }

  @Get('planned-operations')
  @ApiOperation({ summary: 'List planned operations.' })
  getPlannedOperations(@Query() query: GetPlannedOperationsQueryDto) {
    return this.application.getPlannedOperations(query);
  }

  @Post('planned-operations')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Create a planned operation.' })
  createPlannedOperation(@Body() dto: CreatePlannedOperationDto) {
    return this.application.createPlannedOperation(dto);
  }

  @Post('planned-operations/:id/materialize')
  // Создаёт настоящую денежную операцию — то же право, что и ручное создание.
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({
    summary: 'Materialize a planned operation into a real cashflow transaction.',
  })
  materializePlannedOperation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MaterializePlannedOperationDto,
  ) {
    return this.application.materializePlannedOperation(id, dto);
  }

  @Put('planned-operations/:id')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Edit a planned operation.' })
  editPlannedOperation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditPlannedOperationDto,
  ) {
    return this.application.editPlannedOperation(id, dto);
  }

  @Delete('planned-operations/:id')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Delete a planned operation.' })
  deletePlannedOperation(@Param('id', ParseIntPipe) id: number) {
    return this.application.deletePlannedOperation(id);
  }
}
