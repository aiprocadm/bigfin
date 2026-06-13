// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { Credit } from '../models/Credit.model';
import { CreditInstallment } from '../models/CreditInstallment.model';
import { getCreditInstallmentPaymentGLEntries } from '../utils/creditGLEntries';
import { ERRORS } from '../constants';

/**
 * Отмечает платёж по кредиту оплаченным:
 *  1. Формирует GL-проводки (тело долга + проценты → банк).
 *  2. Патчит статус рассрочки → 'paid'.
 *  3. Удаляет связанную плановую операцию из платёжного календаря.
 *  4. Если все рассрочки оплачены — переводит кредит в статус 'closed'.
 */
@Injectable()
export class MarkInstallmentPaidService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,

    @Inject(CreditInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof CreditInstallment>,

    @Inject(PlannedOperation.name)
    private readonly plannedOperationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  public async markPaid(creditId: number, installmentId: number) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const credit: any = await this.creditModel().query(trx).findById(creditId);
      if (!credit) throw new ServiceError(ERRORS.CREDIT_NOT_FOUND);

      const inst: any = await this.installmentModel()
        .query(trx)
        .findById(installmentId)
        .where('creditId', creditId);
      if (!inst) throw new ServiceError(ERRORS.INSTALLMENT_NOT_FOUND);
      if (inst.status === 'paid') {
        throw new ServiceError(ERRORS.INSTALLMENT_ALREADY_PAID);
      }

      const ledger = new Ledger(
        getCreditInstallmentPaymentGLEntries({
          installmentId: inst.id,
          date: inst.dueDate,
          principalAmount: Number(inst.principalAmount),
          interestAmount: Number(inst.interestAmount),
          paymentAmount: Number(inst.paymentAmount),
          currencyCode,
          bankAccountId: credit.paymentAccountId,
          liabilityAccountId: credit.liabilityAccountId,
          interestExpenseAccountId: credit.interestExpenseAccountId,
        }),
      );
      await this.ledgerStorage.commit(ledger, trx);

      await this.installmentModel()
        .query(trx)
        .findById(installmentId)
        .patch({ status: 'paid', paidDate: moment().format('YYYY-MM-DD') } as any);

      await this.plannedOperationModel()
        .query(trx)
        .where('sourceType', 'CreditInstallment')
        .andWhere('sourceId', installmentId)
        .delete();

      const remaining = await this.installmentModel()
        .query(trx)
        .where('creditId', creditId)
        .andWhere('status', 'planned')
        .resultSize();

      if (remaining === 0) {
        await this.creditModel()
          .query(trx)
          .findById(creditId)
          .patch({ status: 'closed' } as any);
      }

      return this.creditModel()
        .query(trx)
        .findById(creditId)
        .withGraphFetched('installments');
    });
  }
}
