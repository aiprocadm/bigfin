// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DealStage } from '../models/DealStage.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteDealStageService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(DealStage.name)
    private readonly stageModel: TenantModelProxy<typeof DealStage>,
  ) {}

  public async delete(dealId: number, stageId: number) {
    const existing = await this.stageModel().query().findById(stageId);
    if (!existing || existing.dealId !== dealId) {
      throw new ServiceError(ERRORS.STAGE_NOT_FOUND);
    }

    return this.uow.withTransaction((trx: Knex.Transaction) =>
      this.stageModel().query(trx).findById(stageId).delete(),
    );
  }
}
