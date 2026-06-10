// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PayrollRun } from '../models/PayrollRun.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { ERRORS } from '../constants';
import { CommandPayrollRunValidatorService } from './CommandPayrollRunValidator.service';

@Injectable()
export class DeletePayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPayrollRunValidatorService,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,
  ) {}

  /** Удаляется только черновик (FK на строки — CASCADE, но чистим явно). */
  public async delete(id: number) {
    const run: any = await this.runModel().query().findById(id);
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);
    this.validator.validateDraft(run);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.lineModel().query(trx).where('runId', id).delete();
      await this.runModel().query(trx).deleteById(id);
    });
  }
}
