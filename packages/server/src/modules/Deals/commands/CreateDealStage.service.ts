// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DealStage } from '../models/DealStage.model';
import { CommandDealStageValidatorService } from './CommandDealStageValidator.service';
import { CreateDealStageDto } from '../dtos/DealStage.dto';

@Injectable()
export class CreateDealStageService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandDealStageValidatorService,

    @Inject(DealStage.name)
    private readonly stageModel: TenantModelProxy<typeof DealStage>,
  ) {}

  public async create(dealId: number, dto: CreateDealStageDto) {
    await this.validator.validate(dealId, dto as any);

    return this.uow.withTransaction((trx: Knex.Transaction) =>
      this.stageModel().query(trx).insertAndFetch({ ...(dto as any), dealId }),
    );
  }
}
