// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { computePlanProgress } from '../utils/computePlanProgress';

@Injectable()
export class GetRepaymentPlansService {
  constructor(
    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,
  ) {}

  /**
   * Список планов погашения (опц. фильтр side/contact) с прогрессом по каждому.
   */
  public async getPlans(filter: { side?: string; contactId?: number }) {
    const asDate = moment().format('YYYY-MM-DD');
    const plans = await this.planModel()
      .query()
      .withGraphFetched('installments')
      .onBuild((q) => {
        if (filter.side) q.where('side', filter.side);
        if (filter.contactId) q.where('contactId', filter.contactId);
      });

    return (plans as any[]).map((plan) => ({
      ...plan,
      progress: computePlanProgress(
        (plan.installments || []).map((i: any) => ({
          amount: Number(i.amount),
          status: i.status,
          dueDate: moment(i.dueDate).format('YYYY-MM-DD'),
        })),
        asDate,
      ),
    }));
  }
}
