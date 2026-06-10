// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PayrollRun } from '../models/PayrollRun.model';
import { summarizeRun } from '../utils/summarizeRun';

@Injectable()
export class GetPayrollRunsService {
  constructor(
    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,
  ) {}

  public async getRuns(year?: number) {
    const query = this.runModel()
      .query()
      .withGraphFetched('lines')
      .orderBy('periodMonth', 'desc');
    if (year) query.modify('filterByYear', year);

    const runs: any[] = await query;
    return runs.map((run) => ({
      ...run,
      totals: summarizeRun(run.lines || []),
    }));
  }
}
