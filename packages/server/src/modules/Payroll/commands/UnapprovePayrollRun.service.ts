// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { PayrollRun } from '../models/PayrollRun.model';
import { ERRORS, PAYROLL_SOURCE } from '../constants';

@Injectable()
export class UnapprovePayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /** Возврат в черновик: удаляет связанные плановые операции календаря. */
  public async unapprove(id: number) {
    const run: any = await this.runModel().query().findById(id);
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);
    if (run.status !== 'approved') {
      throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_APPROVED);
    }
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.operationModel()
        .query(trx)
        .where('sourceType', PAYROLL_SOURCE)
        .where('sourceId', id)
        .delete();

      await this.runModel()
        .query(trx)
        .findById(id)
        .patch({ status: 'draft' } as any);

      return this.runModel().query(trx).findById(id);
    });
  }
}
