import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { CommandPlannedOperationValidatorService } from './CommandPlannedOperationValidator.service';
import { EditPlannedOperationDto } from '../dtos/PlannedOperation.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditPlannedOperationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPlannedOperationValidatorService,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Edits a planned operation.
   * @param {number} operationId
   * @param {EditPlannedOperationDto} dto
   * @returns {Promise<PlannedOperation>}
   */
  public async edit(
    operationId: number,
    dto: EditPlannedOperationDto,
  ): Promise<PlannedOperation> {
    const existing = await this.operationModel().query().findById(operationId);
    if (!existing) {
      throw new ServiceError(ERRORS.PLANNED_OPERATION_NOT_FOUND);
    }

    await this.validator.validateArticleExists(dto.articleId);
    await this.validator.validateAccountExists(dto.accountId);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.operationModel()
        .query(trx)
        .patchAndFetchById(operationId, { ...dto });
    });
  }
}
