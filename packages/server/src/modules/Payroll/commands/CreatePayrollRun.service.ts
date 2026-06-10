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
import { CreatePayrollRunDto } from '../dtos/PayrollRun.dto';
import { ERRORS } from '../constants';
import { computePayrollLine } from '../utils/computePayrollLine';
import { PayrollSettingsService } from '../PayrollSettings.service';

@Injectable()
export class CreatePayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly payrollSettings: PayrollSettingsService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,
  ) {}

  /** Создаёт черновик начисления и заполняет строки активными сотрудниками. */
  public async create(dto: CreatePayrollRunDto) {
    const periodMonth = moment(dto.periodMonth)
      .startOf('month')
      .format('YYYY-MM-DD');

    const employees: any[] = await this.employeeModel()
      .query()
      .modify('activeOnly')
      .orderBy('fullName');
    const settings = await this.payrollSettings.getSettings();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const existing = await this.runModel()
        .query(trx)
        .findOne({ periodMonth });
      if (existing) throw new ServiceError(ERRORS.PAYROLL_RUN_MONTH_EXISTS);

      const run: any = await this.runModel()
        .query(trx)
        .insert({
          periodMonth,
          payDate: moment(dto.payDate).format('YYYY-MM-DD'),
          status: 'draft',
          note: dto.note || null,
        } as any);

      for (const employee of employees) {
        const computed = computePayrollLine(
          {
            employmentType: employee.employmentType,
            baseAmount: employee.defaultSalary,
            bonusAmount: 0,
            deductionAmount: 0,
          },
          settings,
        );
        await this.lineModel()
          .query(trx)
          .insert({
            runId: run.id,
            employeeId: employee.id,
            employmentType: employee.employmentType,
            baseAmount: Number(employee.defaultSalary) || 0,
            bonusAmount: 0,
            deductionAmount: 0,
            ndflAmount: computed.ndflAmount,
            contributionsAmount: computed.contributionsAmount,
            netAmount: computed.netAmount,
            totalCost: computed.totalCost,
          } as any);
      }
      return run;
    });
  }
}
