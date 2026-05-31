import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';

@Injectable()
export class GetBudgetsService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Lists budgets ordered by fiscal year desc.
   * @returns {Promise<{ data: Budget[] }>}
   */
  public async getBudgets(): Promise<{ data: Budget[] }> {
    const data = await this.budgetModel().query().orderBy('fiscalYear', 'desc');
    return { data };
  }
}
