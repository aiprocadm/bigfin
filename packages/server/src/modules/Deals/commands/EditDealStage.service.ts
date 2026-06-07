// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DealStage } from '../models/DealStage.model';
import { CommandDealStageValidatorService } from './CommandDealStageValidator.service';
import { EditDealStageDto } from '../dtos/DealStage.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditDealStageService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandDealStageValidatorService,

    @Inject(DealStage.name)
    private readonly stageModel: TenantModelProxy<typeof DealStage>,
  ) {}

  public async edit(dealId: number, stageId: number, dto: EditDealStageDto) {
    const existing = await this.stageModel().query().findById(stageId);
    if (!existing || existing.dealId !== dealId) {
      throw new ServiceError(ERRORS.STAGE_NOT_FOUND);
    }
    await this.validator.validate(dealId, dto as any);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.stageModel().query(trx).findById(stageId).patch({ ...(dto as any) });
      return this.stageModel().query(trx).findById(stageId);
    });
  }
}
