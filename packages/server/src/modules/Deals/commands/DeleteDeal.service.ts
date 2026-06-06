// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Deal } from '../models/Deal.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteDealService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,

    @Inject(AccountTransaction.name)
    private readonly txnModel: TenantModelProxy<typeof AccountTransaction>,
  ) {}

  public async delete(id: number) {
    const deal = await this.dealModel().query().findById(id);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);

    // Не удаляем сделку, на которую уже навешаны проводки (FK + смысл).
    const used = await this.txnModel().query().where('projectId', id).first();
    if (used) throw new ServiceError(ERRORS.DEAL_HAS_OPERATIONS);

    return this.uow.withTransaction((trx: Knex.Transaction) =>
      this.dealModel().query(trx).findById(id).delete(),
    );
  }
}
