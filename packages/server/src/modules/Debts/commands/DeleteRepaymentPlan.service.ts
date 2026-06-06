// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteRepaymentPlanService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,
  ) {}

  /**
   * Удаляет план погашения (строки графика уходят каскадом по FK).
   */
  public async delete(id: number) {
    const existing = await this.planModel().query().findById(id);
    if (!existing) throw new ServiceError(ERRORS.REPAYMENT_PLAN_NOT_FOUND);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.planModel().query(trx).deleteById(id);
    });
  }
}
