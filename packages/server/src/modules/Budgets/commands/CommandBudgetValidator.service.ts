import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { ERRORS } from '../constants';

@Injectable()
export class CommandBudgetValidatorService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Validates the budget exists and returns it.
   * @param {number} budgetId
   * @returns {Promise<Budget>}
   */
  public async validateBudgetExists(budgetId: number): Promise<Budget> {
    const budget = await this.budgetModel().query().findById(budgetId);
    if (!budget) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    return budget;
  }
}
