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
import { BudgetsApplication } from './Budgets.application';
import { CreateBudgetDto, EditBudgetDto } from './dtos/Budget.dto';
import { UpsertBudgetLinesDto } from './dtos/UpsertBudgetLines.dto';
import { GetBudgetPlanFactQueryDto } from './dtos/GetBudgetPlanFactQuery.dto';

@Controller('budgets')
@ApiTags('Budgets')
@ApiCommonHeaders()
export class BudgetsController {
  constructor(private readonly application: BudgetsApplication) {}

  @Get()
  @ApiOperation({ summary: 'List budgets.' })
  getBudgets() {
    return this.application.getBudgets();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget with its grid lines.' })
  getBudget(@Param('id', ParseIntPipe) id: number) {
    return this.application.getBudget(id);
  }

  @Get(':id/plan-fact')
  @ApiOperation({ summary: 'Plan vs fact report for a budget.' })
  getPlanFact(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetBudgetPlanFactQueryDto,
  ) {
    return this.application.getPlanFact(id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a budget.' })
  create(@Body() dto: CreateBudgetDto) {
    return this.application.createBudget(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit a budget.' })
  edit(@Param('id', ParseIntPipe) id: number, @Body() dto: EditBudgetDto) {
    return this.application.editBudget(id, dto);
  }

  @Put(':id/lines')
  @ApiOperation({ summary: 'Upsert budget grid cells.' })
  upsertLines(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertBudgetLinesDto,
  ) {
    return this.application.upsertLines(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget.' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteBudget(id);
  }
}
