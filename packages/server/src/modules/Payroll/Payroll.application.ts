// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetEmployeesService } from './queries/GetEmployees.service';
import { GetPayrollRunsService } from './queries/GetPayrollRuns.service';
import { GetPayrollRunService } from './queries/GetPayrollRun.service';
import { GetPayrollTaxesSummaryService } from './queries/GetPayrollTaxesSummary.service';
import { CreateEmployeeService } from './commands/CreateEmployee.service';
import { EditEmployeeService } from './commands/EditEmployee.service';
import { DeleteEmployeeService } from './commands/DeleteEmployee.service';
import { CreatePayrollRunService } from './commands/CreatePayrollRun.service';
import { EditPayrollRunService } from './commands/EditPayrollRun.service';
import { DeletePayrollRunService } from './commands/DeletePayrollRun.service';
import { ApprovePayrollRunService } from './commands/ApprovePayrollRun.service';
import { UnapprovePayrollRunService } from './commands/UnapprovePayrollRun.service';
import { PayrollSettingsService } from './PayrollSettings.service';
import { CreateEmployeeDto, EditEmployeeDto } from './dtos/Employee.dto';
import { CreatePayrollRunDto, EditPayrollRunDto } from './dtos/PayrollRun.dto';

@Injectable()
export class PayrollApplication {
  constructor(
    private readonly getEmployeesService: GetEmployeesService,
    private readonly getRunsService: GetPayrollRunsService,
    private readonly getRunService: GetPayrollRunService,
    private readonly getTaxesSummaryService: GetPayrollTaxesSummaryService,
    private readonly createEmployeeService: CreateEmployeeService,
    private readonly editEmployeeService: EditEmployeeService,
    private readonly deleteEmployeeService: DeleteEmployeeService,
    private readonly createRunService: CreatePayrollRunService,
    private readonly editRunService: EditPayrollRunService,
    private readonly deleteRunService: DeletePayrollRunService,
    private readonly approveRunService: ApprovePayrollRunService,
    private readonly unapproveRunService: UnapprovePayrollRunService,
    private readonly settingsService: PayrollSettingsService,
  ) {}

  getEmployees = (activeOnly?: boolean) =>
    this.getEmployeesService.getEmployees(activeOnly);
  createEmployee = (dto: CreateEmployeeDto) =>
    this.createEmployeeService.create(dto);
  editEmployee = (id: number, dto: EditEmployeeDto) =>
    this.editEmployeeService.edit(id, dto);
  deleteEmployee = (id: number) => this.deleteEmployeeService.delete(id);

  getRuns = (year?: number) => this.getRunsService.getRuns(year);
  getRun = (id: number) => this.getRunService.getRun(id);
  createRun = (dto: CreatePayrollRunDto) => this.createRunService.create(dto);
  editRun = (id: number, dto: EditPayrollRunDto) =>
    this.editRunService.edit(id, dto);
  deleteRun = (id: number) => this.deleteRunService.delete(id);
  approveRun = (id: number) => this.approveRunService.approve(id);
  unapproveRun = (id: number) => this.unapproveRunService.unapprove(id);

  getTaxesSummary = (year: number) =>
    this.getTaxesSummaryService.getSummary(year);
  getSettings = () => this.settingsService.getSettings();
}
