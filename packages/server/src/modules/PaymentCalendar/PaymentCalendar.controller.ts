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
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { PaymentCalendarApplication } from './PaymentCalendar.application';
import {
  CreatePlannedOperationDto,
  EditPlannedOperationDto,
} from './dtos/PlannedOperation.dto';
import { GetPlannedOperationsQueryDto } from './dtos/GetPlannedOperationsQuery.dto';
import { GetPaymentCalendarQueryDto } from './dtos/GetPaymentCalendarQuery.dto';

@Controller('payment-calendar')
@ApiTags('Payment Calendar')
@ApiCommonHeaders()
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
  @ApiOperation({ summary: 'Create a planned operation.' })
  createPlannedOperation(@Body() dto: CreatePlannedOperationDto) {
    return this.application.createPlannedOperation(dto);
  }

  @Put('planned-operations/:id')
  @ApiOperation({ summary: 'Edit a planned operation.' })
  editPlannedOperation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditPlannedOperationDto,
  ) {
    return this.application.editPlannedOperation(id, dto);
  }

  @Delete('planned-operations/:id')
  @ApiOperation({ summary: 'Delete a planned operation.' })
  deletePlannedOperation(@Param('id', ParseIntPipe) id: number) {
    return this.application.deletePlannedOperation(id);
  }
}
