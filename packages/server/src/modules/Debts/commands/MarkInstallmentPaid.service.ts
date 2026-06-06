// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { DebtRepaymentInstallment } from '../models/DebtRepaymentInstallment.model';
import { ERRORS } from '../constants';

@Injectable()
export class MarkInstallmentPaidService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,

    @Inject(DebtRepaymentInstallment.name)
    private readonly installmentModel: TenantModelProxy<
      typeof DebtRepaymentInstallment
    >,
  ) {}

  /**
   * Отмечает платёж оплаченным; если все платежи оплачены — план completed.
   */
  public async markPaid(planId: number, installmentId: number) {
    const inst = await this.installmentModel()
      .query()
      .findById(installmentId)
      .where('planId', planId);
    if (!inst) throw new ServiceError(ERRORS.INSTALLMENT_NOT_FOUND);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.installmentModel()
        .query(trx)
        .findById(installmentId)
        .patch({ status: 'paid', paidAt: moment().toISOString() } as any);

      const remaining = await this.installmentModel()
        .query(trx)
        .where('planId', planId)
        .andWhere('status', 'planned')
        .resultSize();
      if (remaining === 0) {
        await this.planModel()
          .query(trx)
          .findById(planId)
          .patch({ status: 'completed' } as any);
      }

      return this.planModel()
        .query(trx)
        .findById(planId)
        .withGraphFetched('installments');
    });
  }
}
