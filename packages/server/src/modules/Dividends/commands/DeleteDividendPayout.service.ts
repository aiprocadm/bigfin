// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { DividendPayout } from '../models/DividendPayout.model';
import { DIVIDEND_PAYOUT_TRANSACTION_TYPE, ERRORS } from '../constants';

/**
 * Удаляет выплату собственнику: сторнирует её GL-проводки
 * (deleteByReference — паттерн Expenses) и удаляет строку.
 */
@Injectable()
export class DeleteDividendPayoutService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,

    @Inject(DividendPayout.name)
    private readonly payoutModel: TenantModelProxy<typeof DividendPayout>,
  ) {}

  public async delete(id: number) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const payout = await this.payoutModel().query(trx).findById(id);

      if (!payout) {
        throw new ServiceError(ERRORS.DIVIDEND_PAYOUT_NOT_FOUND);
      }
      await this.ledgerStorage.deleteByReference(
        id,
        DIVIDEND_PAYOUT_TRANSACTION_TYPE,
        trx,
      );
      await this.payoutModel().query(trx).deleteById(id);

      return { id };
    });
  }
}
