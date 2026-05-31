import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeletePlannedOperationService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Deletes a planned operation.
   * @param {number} operationId
   */
  public async delete(operationId: number) {
    const operation = await this.operationModel()
      .query()
      .findById(operationId);
    if (!operation) {
      throw new ServiceError(ERRORS.PLANNED_OPERATION_NOT_FOUND);
    }

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.operationModel().query(trx).deleteById(operationId);
    });
  }
}
