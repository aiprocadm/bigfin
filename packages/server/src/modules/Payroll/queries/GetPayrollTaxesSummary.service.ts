// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PayrollRun } from '../models/PayrollRun.model';
import { summarizeRun } from '../utils/summarizeRun';
import { round2 } from '../utils/payrollMath';

@Injectable()
export class GetPayrollTaxesSummaryService {
  constructor(
    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,
  ) {}

  /** «Налоги к уплате»: по месяцам года из проведённых начислений. */
  public async getSummary(year: number) {
    const runs: any[] = await this.runModel()
      .query()
      .withGraphFetched('lines')
      .modify('approvedOnly')
      .modify('filterByYear', year)
      .orderBy('periodMonth');

    return runs.map((run) => {
      const totals = summarizeRun(run.lines || []);
      return {
        month: moment(run.periodMonth).format('YYYY-MM'),
        ndfl: totals.totalNdfl,
        contributions: totals.totalContributions,
        total: round2(totals.totalNdfl + totals.totalContributions),
      };
    });
  }
}
