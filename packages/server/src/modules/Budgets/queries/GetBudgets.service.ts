import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';

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
  public async getBudgets(keyword?: string): Promise<{ data: Budget[] }> {
    const query = this.budgetModel().query();

    applyKeywordSearch(query, Budget.searchColumns, keyword);

    const data = await query.orderBy('fiscalYear', 'desc');
    return { data };
  }
}
