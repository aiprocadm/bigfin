// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { CommandDealValidatorService } from './CommandDealValidator.service';
import { CreateDealDto } from '../dtos/Deal.dto';
import { DEFAULT_DEAL_STATUS } from '../constants';

@Injectable()
export class CreateDealService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandDealValidatorService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async create(dto: CreateDealDto) {
    await this.validator.validateRefs(dto);

    return this.uow.withTransaction((trx: Knex.Transaction) =>
      this.dealModel()
        .query(trx)
        .insert({ ...dto, status: dto.status || DEFAULT_DEAL_STATUS } as any),
    );
  }
}
