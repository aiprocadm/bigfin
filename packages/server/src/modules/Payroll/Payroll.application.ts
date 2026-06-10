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

  public getEmployees(activeOnly?: boolean) {
    return this.getEmployeesService.getEmployees(activeOnly);
  }

  public createEmployee(dto: CreateEmployeeDto) {
    return this.createEmployeeService.create(dto);
  }

  public editEmployee(id: number, dto: EditEmployeeDto) {
    return this.editEmployeeService.edit(id, dto);
  }

  public deleteEmployee(id: number) {
    return this.deleteEmployeeService.delete(id);
  }

  public getRuns(year?: number) {
    return this.getRunsService.getRuns(year);
  }

  public getRun(id: number) {
    return this.getRunService.getRun(id);
  }

  public createRun(dto: CreatePayrollRunDto) {
    return this.createRunService.create(dto);
  }

  public editRun(id: number, dto: EditPayrollRunDto) {
    return this.editRunService.edit(id, dto);
  }

  public deleteRun(id: number) {
    return this.deleteRunService.delete(id);
  }

  public approveRun(id: number) {
    return this.approveRunService.approve(id);
  }

  public unapproveRun(id: number) {
    return this.unapproveRunService.unapprove(id);
  }

  public getTaxesSummary(year: number) {
    return this.getTaxesSummaryService.getSummary(year);
  }

  public getSettings() {
    return this.settingsService.getSettings();
  }
}
