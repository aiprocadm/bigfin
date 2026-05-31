import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { CreateBudgetDto } from '../dtos/Budget.dto';

@Injectable()
export class CreateBudgetService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Creates a budget.
   * @param {CreateBudgetDto} dto
   * @returns {Promise<Budget>}
   */
  public async create(dto: CreateBudgetDto): Promise<Budget> {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.budgetModel()
        .query(trx)
        .insert({ ...dto, activeScenario: dto.activeScenario || 'realistic' });
    });
  }
}
