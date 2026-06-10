// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { PayrollController } from './Payroll.controller';
import { PayrollApplication } from './Payroll.application';
import { PayrollSettingsService } from './PayrollSettings.service';
import { GetEmployeesService } from './queries/GetEmployees.service';
import { GetPayrollRunsService } from './queries/GetPayrollRuns.service';
import { GetPayrollRunService } from './queries/GetPayrollRun.service';
import { GetPayrollTaxesSummaryService } from './queries/GetPayrollTaxesSummary.service';
import { CommandEmployeeValidatorService } from './commands/CommandEmployeeValidator.service';
import { CommandPayrollRunValidatorService } from './commands/CommandPayrollRunValidator.service';
import { CreateEmployeeService } from './commands/CreateEmployee.service';
import { EditEmployeeService } from './commands/EditEmployee.service';
import { DeleteEmployeeService } from './commands/DeleteEmployee.service';
import { CreatePayrollRunService } from './commands/CreatePayrollRun.service';
import { EditPayrollRunService } from './commands/EditPayrollRun.service';
import { DeletePayrollRunService } from './commands/DeletePayrollRun.service';
import { ApprovePayrollRunService } from './commands/ApprovePayrollRun.service';
import { UnapprovePayrollRunService } from './commands/UnapprovePayrollRun.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [PayrollController],
  providers: [
    PayrollApplication,
    PayrollSettingsService,
    GetEmployeesService,
    GetPayrollRunsService,
    GetPayrollRunService,
    GetPayrollTaxesSummaryService,
    CommandEmployeeValidatorService,
    CommandPayrollRunValidatorService,
    CreateEmployeeService,
    EditEmployeeService,
    DeleteEmployeeService,
    CreatePayrollRunService,
    EditPayrollRunService,
    DeletePayrollRunService,
    ApprovePayrollRunService,
    UnapprovePayrollRunService,
  ],
})
export class PayrollModule {}
