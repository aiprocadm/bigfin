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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { DealsApplication } from './Deals.application';
import { CreateDealDto, EditDealDto } from './dtos/Deal.dto';
import { GetDealsQueryDto } from './dtos/GetDealsQuery.dto';

@Controller('deals')
@ApiTags('Deals')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class DealsController {
  constructor(private readonly application: DealsApplication) {}

  @Get()
  @ApiOperation({ summary: 'List deals (filter by status).' })
  getList(@Query() query: GetDealsQueryDto) {
    return this.application.getDeals(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Deals dashboard summary (per-deal margins + totals).' })
  getSummary(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.application.getSummary({ fromDate, toDate });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deal.' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.application.getDeal(id);
  }

  @Get(':id/profitability')
  @ApiOperation({ summary: 'Deal profitability (revenue − direct costs).' })
  profitability(
    @Param('id', ParseIntPipe) id: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.application.getProfitability(id, { fromDate, toDate });
  }

  @Post()
  @ApiOperation({ summary: 'Create a deal.' })
  create(@Body() dto: CreateDealDto) {
    return this.application.createDeal(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit a deal.' })
  edit(@Param('id', ParseIntPipe) id: number, @Body() dto: EditDealDto) {
    return this.application.editDeal(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deal.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteDeal(id);
  }
}
