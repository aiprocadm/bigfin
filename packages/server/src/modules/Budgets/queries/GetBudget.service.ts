import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetBudgetService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Retrieves a budget with all its lines (the grid).
   * @param {number} budgetId
   * @returns {Promise<Budget>}
   */
  public async getBudget(budgetId: number): Promise<Budget> {
    const budget = await this.budgetModel()
      .query()
      .findById(budgetId)
      .withGraphFetched('lines');
    if (!budget) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    return budget;
  }
}
