// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { CommandDealValidatorService } from './CommandDealValidator.service';
import { EditDealDto } from '../dtos/Deal.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditDealService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandDealValidatorService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async edit(id: number, dto: EditDealDto) {
    const deal = await this.dealModel().query().findById(id);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);
    await this.validator.validateRefs(dto);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.dealModel().query(trx).findById(id).patch({ ...dto } as any);
      return this.dealModel().query(trx).findById(id);
    });
  }
}
