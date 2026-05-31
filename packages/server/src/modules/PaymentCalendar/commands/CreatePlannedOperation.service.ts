import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { CommandPlannedOperationValidatorService } from './CommandPlannedOperationValidator.service';
import { CreatePlannedOperationDto } from '../dtos/PlannedOperation.dto';

@Injectable()
export class CreatePlannedOperationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPlannedOperationValidatorService,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Creates a planned operation.
   * @param {CreatePlannedOperationDto} dto
   * @param {Knex.Transaction} [trx]
   * @returns {Promise<PlannedOperation>}
   */
  public async create(
    dto: CreatePlannedOperationDto,
    trx?: Knex.Transaction,
  ): Promise<PlannedOperation> {
    await this.validator.validateArticleExists(dto.articleId);
    await this.validator.validateAccountExists(dto.accountId);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.operationModel()
        .query(trx)
        .insert({
          ...dto,
          currencyCode: dto.currencyCode || 'RUB',
          status: dto.status || 'planned',
        });
    }, trx);
  }
}
