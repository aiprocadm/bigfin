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
import { BudgetsApplication } from './Budgets.application';
import { CreateBudgetDto, EditBudgetDto } from './dtos/Budget.dto';
import { UpsertBudgetLinesDto } from './dtos/UpsertBudgetLines.dto';
import { GetBudgetPlanFactQueryDto } from './dtos/GetBudgetPlanFactQuery.dto';
import { BudgetAutofillDto, BudgetCashPlanQueryDto } from './dtos/BudgetPlanning.dto';
import { BudgetPlanningService } from './queries/BudgetPlanning.service';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { RequireFeature } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

/**
 * Бюджет — план всей организации: по нему считается план-факт у всех, кто
 * смотрит отчёты. Поэтому право то же, что у настроек.
 */
@Controller('budgets')
@ApiTags('Budgets')
@ApiCommonHeaders()
@UseGuards(FeatureGuard, AuthorizationGuard, PermissionGuard)
@RequireFeature(Features.BUDGETS)
export class BudgetsController {
  constructor(
    private readonly application: BudgetsApplication,
    private readonly planning: BudgetPlanningService,
  ) {}

  @Get(':id/cash-plan')
  @ApiOperation({ summary: 'Денежный план по месяцам с привязкой остатка к факту или плану (FT-056).' })
  @RequireApiScope('reports:read')
  cashPlan(@Param('id', ParseIntPipe) id: number, @Query() query: BudgetCashPlanQueryDto) {
    return this.planning.cashPlan(id, query.scenario, query.anchor as any);
  }

  @Post(':id/autofill/preview')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Предпросмотр автозаполнения бюджета из истории (FT-054).' })
  autofillPreview(@Param('id', ParseIntPipe) id: number, @Body() body: BudgetAutofillDto) {
    return this.planning.autofillPreview(id, body);
  }

  @Post(':id/autofill')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Заполнить бюджет по прошлому году с коэффициентом (FT-054).' })
  autofill(@Param('id', ParseIntPipe) id: number, @Body() body: BudgetAutofillDto) {
    return this.planning.autofillApply(id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List budgets.' })
  @RequireApiScope('reports:read')
  getBudgets(@Query('keyword') keyword?: string) {
    return this.application.getBudgets(keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget with its grid lines.' })
  @RequireApiScope('reports:read')
  getBudget(@Param('id', ParseIntPipe) id: number) {
    return this.application.getBudget(id);
  }

  @Get(':id/plan-fact')
  @ApiOperation({ summary: 'Plan vs fact report for a budget.' })
  @RequireApiScope('reports:read')
  getPlanFact(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetBudgetPlanFactQueryDto,
  ) {
    return this.application.getPlanFact(id, query);
  }

  @Post()
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Create a budget.' })
  create(@Body() dto: CreateBudgetDto) {
    return this.application.createBudget(dto);
  }

  @Put(':id')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Edit a budget.' })
  edit(@Param('id', ParseIntPipe) id: number, @Body() dto: EditBudgetDto) {
    return this.application.editBudget(id, dto);
  }

  @Put(':id/lines')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Upsert budget grid cells.' })
  upsertLines(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertBudgetLinesDto,
  ) {
    return this.application.upsertLines(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Delete a budget.' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteBudget(id);
  }
}
