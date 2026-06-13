// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Credit } from '../models/Credit.model';
import { CreditInstallment } from '../models/CreditInstallment.model';
import {
  CREDIT_DISBURSEMENT_TRANSACTION_TYPE,
  CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE,
  ERRORS,
} from '../constants';

@Injectable()
export class DeleteCreditService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,

    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
    @Inject(CreditInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof CreditInstallment>,
    @Inject(PlannedOperation.name)
    private readonly plannedOperationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  public async delete(id: number) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const credit = await this.creditModel().query(trx).findById(id);
      if (!credit) throw new ServiceError(ERRORS.CREDIT_NOT_FOUND);

      const installments: any[] = await this.installmentModel()
        .query(trx)
        .where('creditId', id);
      const installmentIds = installments.map((i) => i.id);

      await this.ledgerStorage.deleteByReference(
        id,
        CREDIT_DISBURSEMENT_TRANSACTION_TYPE,
        trx,
      );
      for (const inst of installments.filter((i) => i.status === 'paid')) {
        await this.ledgerStorage.deleteByReference(
          inst.id,
          CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE,
          trx,
        );
      }
      if (installmentIds.length) {
        await this.plannedOperationModel()
          .query(trx)
          .where('sourceType', 'CreditInstallment')
          .whereIn('sourceId', installmentIds)
          .delete();
      }
      await this.installmentModel().query(trx).where('creditId', id).delete();
      await this.creditModel().query(trx).deleteById(id);

      // MVP: счёт-обязательство (liability_account_id) намеренно НЕ удаляем —
      // у него уже были (сторнированные) GL-проводки, удаление сломало бы
      // аудит-след. Остаётся с нулевым сальдо. Очистка/архивация — отдельный заход.
      return { id };
    });
  }
}
