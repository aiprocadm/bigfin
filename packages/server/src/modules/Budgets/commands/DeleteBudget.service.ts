import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteBudgetService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Deletes a budget (its lines cascade via FK ON DELETE CASCADE).
   * @param {number} budgetId
   */
  public async delete(budgetId: number) {
    const budget = await this.budgetModel().query().findById(budgetId);
    if (!budget) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.budgetModel().query(trx).deleteById(budgetId);
    });
  }
}
