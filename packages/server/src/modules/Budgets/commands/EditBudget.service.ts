import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { EditBudgetDto } from '../dtos/Budget.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditBudgetService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Edits a budget.
   * @param {number} budgetId
   * @param {EditBudgetDto} dto
   * @returns {Promise<Budget>}
   */
  public async edit(budgetId: number, dto: EditBudgetDto): Promise<Budget> {
    const existing = await this.budgetModel().query().findById(budgetId);
    if (!existing) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.budgetModel()
        .query(trx)
        .patchAndFetchById(budgetId, { ...dto });
    });
  }
}
