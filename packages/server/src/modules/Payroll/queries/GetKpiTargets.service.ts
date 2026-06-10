// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { EmployeeKpiTarget } from '../models/EmployeeKpiTarget.model';

@Injectable()
export class GetKpiTargetsService {
  constructor(
    @Inject(EmployeeKpiTarget.name)
    private readonly targetModel: TenantModelProxy<typeof EmployeeKpiTarget>,
  ) {}

  /** Планы KPI за год (с ФИО менеджера через graph). */
  public async getTargets(year?: number) {
    const query = this.targetModel()
      .query()
      .withGraphFetched('employee')
      .orderBy('periodMonth');
    if (year != null) query.modify('filterByYear', year);

    return query;
  }
}
