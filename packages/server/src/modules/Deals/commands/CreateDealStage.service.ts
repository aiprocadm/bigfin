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

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Поля «порядок» в форме нет, а сортировка выдачи идёт по нему: без
      // этого все этапы получали sortOrder = 0 и выстраивались произвольно.
      // Новый этап встаёт в конец списка.
      const sortOrder =
        dto.sortOrder ?? (await this.nextSortOrder(dealId, trx));

      return this.stageModel()
        .query(trx)
        .insertAndFetch({ ...(dto as any), sortOrder, dealId });
    });
  }

  private async nextSortOrder(dealId: number, trx: Knex.Transaction) {
    const last: any = await this.stageModel()
      .query(trx)
      .where('dealId', dealId)
      .orderBy('sortOrder', 'desc')
      .first();
    return (Number(last?.sortOrder) || 0) + 1;
  }
}
