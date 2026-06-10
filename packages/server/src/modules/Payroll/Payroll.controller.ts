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
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PayrollApplication } from './Payroll.application';
import { CreateEmployeeDto, EditEmployeeDto } from './dtos/Employee.dto';
import { CreatePayrollRunDto, EditPayrollRunDto } from './dtos/PayrollRun.dto';
import { GetPayrollRunsQueryDto } from './dtos/GetPayrollRunsQuery.dto';
import { GetPayrollTaxesSummaryQueryDto } from './dtos/GetPayrollTaxesSummaryQuery.dto';
import {
  CreateKpiTargetDto,
  EditKpiTargetDto,
  GetKpiSummaryQueryDto,
  GetKpiTargetsQueryDto,
} from './dtos/KpiTarget.dto';

@Controller('payroll')
@ApiTags('Payroll')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class PayrollController {
  constructor(private readonly application: PayrollApplication) {}

  // ---- Settings ----
  @Get('settings')
  @ApiOperation({ summary: 'Payroll rates settings (with defaults applied).' })
  getSettings() {
    return this.application.getSettings();
  }

  // ---- Employees ----
  @Get('employees')
  @ApiOperation({ summary: 'List employees.' })
  getEmployees(@Query('activeOnly') activeOnly?: string) {
    return this.application.getEmployees(activeOnly === 'true');
  }

  @Post('employees')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Create an employee (admin only).' })
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.application.createEmployee(dto);
  }

  @Put('employees/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Edit an employee (admin only).' })
  editEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditEmployeeDto,
  ) {
    return this.application.editEmployee(id, dto);
  }

  @Delete('employees/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete an employee without payroll lines (admin only).' })
  deleteEmployee(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteEmployee(id);
  }

  // ---- KPI targets ----
  @Get('kpi/targets')
  @ApiOperation({ summary: 'List manager KPI targets (optionally by year).' })
  getKpiTargets(@Query() query: GetKpiTargetsQueryDto) {
    return this.application.getKpiTargets(query.year);
  }

  @Post('kpi/targets')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Create a monthly KPI target for a manager (admin only).' })
  createKpiTarget(@Body() dto: CreateKpiTargetDto) {
    return this.application.createKpiTarget(dto);
  }

  @Put('kpi/targets/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Edit a KPI target (admin only).' })
  editKpiTarget(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditKpiTargetDto,
  ) {
    return this.application.editKpiTarget(id, dto);
  }

  @Delete('kpi/targets/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete a KPI target (admin only).' })
  deleteKpiTarget(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteKpiTarget(id);
  }

  @Get('kpi/summary')
  @ApiOperation({ summary: 'Monthly KPI plan/fact/bonus summary by manager.' })
  getKpiSummary(@Query() query: GetKpiSummaryQueryDto) {
    return this.application.getKpiSummary(query.month);
  }

  // ---- Taxes summary ----
  @Get('taxes-summary')
  @ApiOperation({ summary: 'Monthly payroll taxes summary (approved runs).' })
  getTaxesSummary(@Query() query: GetPayrollTaxesSummaryQueryDto) {
    return this.application.getTaxesSummary(query.year);
  }

  // ---- Runs ----
  @Get('runs')
  @ApiOperation({ summary: 'List payroll runs (with totals).' })
  getRuns(@Query() query: GetPayrollRunsQueryDto) {
    return this.application.getRuns(query.year);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get a payroll run with lines and totals.' })
  getRun(@Param('id', ParseIntPipe) id: number) {
    return this.application.getRun(id);
  }

  @Post('runs')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Create a draft run prefilled with active employees (admin only).' })
  createRun(@Body() dto: CreatePayrollRunDto) {
    return this.application.createRun(dto);
  }

  @Put('runs/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Edit a draft run; lines are recomputed server-side (admin only).' })
  editRun(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditPayrollRunDto,
  ) {
    return this.application.editRun(id, dto);
  }

  @Delete('runs/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete a draft run (admin only).' })
  deleteRun(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteRun(id);
  }

  @Post('runs/:id/approve')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Approve a run → planned outflows in the calendar (admin only).' })
  approveRun(@Param('id', ParseIntPipe) id: number) {
    return this.application.approveRun(id);
  }

  @Post('runs/:id/unapprove')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Back to draft; removes linked planned operations (admin only).' })
  unapproveRun(@Param('id', ParseIntPipe) id: number) {
    return this.application.unapproveRun(id);
  }
}
