// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Employee } from '../models/Employee.model';
import { PayrollRun } from '../models/PayrollRun.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { EditPayrollRunDto } from '../dtos/PayrollRun.dto';
import { ERRORS } from '../constants';
import { computePayrollLine } from '../utils/computePayrollLine';
import { PayrollSettingsService } from '../PayrollSettings.service';
import { CommandPayrollRunValidatorService } from './CommandPayrollRunValidator.service';

@Injectable()
export class EditPayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly payrollSettings: PayrollSettingsService,
    private readonly validator: CommandPayrollRunValidatorService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,
  ) {}

  public async edit(id: number, dto: EditPayrollRunDto) {
    const run: any = await this.runModel().query().findById(id);
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);
    this.validator.validateDraft(run);

    if (dto.lines) this.validator.validateLines(dto.lines);
    const settings = await this.payrollSettings.getSettings();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.runModel()
        .query(trx)
        .findById(id)
        .patch({
          ...(dto.payDate
            ? { payDate: moment(dto.payDate).format('YYYY-MM-DD') }
            : {}),
          ...(dto.note !== undefined ? { note: dto.note || null } : {}),
        } as any);

      if (dto.lines) {
        await this.lineModel().query(trx).where('runId', id).delete();

        const employeeIds = dto.lines.map((l) => l.employeeId);
        const employees: any[] = await this.employeeModel()
          .query(trx)
          .whereIn('id', employeeIds);
        const employeesById = new Map(employees.map((e: any) => [e.id, e]));

        for (const line of dto.lines) {
          const employee = employeesById.get(line.employeeId);
          if (!employee) throw new ServiceError(ERRORS.EMPLOYEE_NOT_FOUND);

          const computed = computePayrollLine(
            {
              employmentType: employee.employmentType,
              baseAmount: line.baseAmount,
              bonusAmount: line.bonusAmount ?? 0,
              deductionAmount: line.deductionAmount ?? 0,
            },
            settings,
          );
          await this.lineModel()
            .query(trx)
            .insert({
              runId: id,
              employeeId: line.employeeId,
              employmentType: employee.employmentType,
              baseAmount: Number(line.baseAmount) || 0,
              bonusAmount: Number(line.bonusAmount) || 0,
              deductionAmount: Number(line.deductionAmount) || 0,
              ndflAmount: computed.ndflAmount,
              contributionsAmount: computed.contributionsAmount,
              netAmount: computed.netAmount,
              totalCost: computed.totalCost,
            } as any);
        }
      }
      return this.runModel().query(trx).findById(id);
    });
  }
}
