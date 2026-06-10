// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PayrollRun } from '../models/PayrollRun.model';
import { ERRORS } from '../constants';
import { summarizeRun } from '../utils/summarizeRun';
import { payrollTaxDate } from '../utils/payrollTaxDate';

@Injectable()
export class GetPayrollRunService {
  constructor(
    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,
  ) {}

  public async getRun(id: number) {
    const run: any = await this.runModel()
      .query()
      .findById(id)
      .withGraphFetched('lines.employee');
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);

    return {
      ...run,
      totals: summarizeRun(run.lines || []),
      taxDate: payrollTaxDate(run.periodMonth),
    };
  }
}
