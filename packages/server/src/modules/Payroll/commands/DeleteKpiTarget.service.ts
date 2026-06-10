// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { EmployeeKpiTarget } from '../models/EmployeeKpiTarget.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteKpiTargetService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(EmployeeKpiTarget.name)
    private readonly targetModel: TenantModelProxy<typeof EmployeeKpiTarget>,
  ) {}

  public async delete(id: number) {
    const target = await this.targetModel().query().findById(id);
    if (!target) throw new ServiceError(ERRORS.KPI_TARGET_NOT_FOUND);

    return this.uow.withTransaction((trx: Knex.Transaction) =>
      this.targetModel().query(trx).deleteById(id),
    );
  }
}
