// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Credit } from '../models/Credit.model';
import { ERRORS } from '../constants';
import { EditCreditDto } from '../dtos/Credit.dto';

@Injectable()
export class EditCreditService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
  ) {}

  public async edit(id: number, dto: EditCreditDto) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const credit = await this.creditModel().query(trx).findById(id);
      if (!credit) throw new ServiceError(ERRORS.CREDIT_NOT_FOUND);

      await this.creditModel()
        .query(trx)
        .findById(id)
        .patch({
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.lender !== undefined ? { lender: dto.lender } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
        } as any);

      return this.creditModel().query(trx).findById(id);
    });
  }
}
