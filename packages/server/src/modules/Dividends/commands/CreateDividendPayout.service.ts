// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Account } from '@/modules/Accounts/models/Account.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { DividendPayout } from '../models/DividendPayout.model';
import {
  CASH_ACCOUNT_TYPES,
  ERRORS,
  OWNER_PAYOUTS_ACCOUNT,
} from '../constants';
import { getDividendPayoutGLEntries } from '../utils/payoutGLEntries';
import { CreateDividendPayoutDto } from '../dtos/DividendPayout.dto';

/**
 * Регистрирует выплату собственнику: строка dividend_payouts + GL-проводки
 * (дебет equity «Выплаты собственнику», кредит денежного счёта) в одной
 * транзакции. Equity-счёт создаётся лениво (find-or-create по slug —
 * паттерн findOrCreateTaxPayable). Превышение «безопасной» суммы сервер
 * не блокирует — предупреждает UI.
 */
@Injectable()
export class CreateDividendPayoutService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,

    @Inject(DividendPayout.name)
    private readonly payoutModel: TenantModelProxy<typeof DividendPayout>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async create(dto: CreateDividendPayoutDto) {
    if (!(Number(dto.amount) > 0)) {
      throw new ServiceError(ERRORS.INVALID_AMOUNT);
    }
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const paymentAccount: any = await this.accountModel()
        .query(trx)
        .findById(dto.paymentAccountId);

      if (!paymentAccount) {
        throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_FOUND);
      }
      if (!CASH_ACCOUNT_TYPES.includes(paymentAccount.accountType)) {
        throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_CASH);
      }
      const equityAccount = await this.findOrCreateEquityAccount(
        currencyCode,
        trx,
      );
      const payout: any = await this.payoutModel()
        .query(trx)
        .insertAndFetch({
          date: dto.date,
          amount: dto.amount,
          paymentAccountId: dto.paymentAccountId,
          equityAccountId: equityAccount.id,
          note: dto.note ?? null,
        } as any);

      const ledger = new Ledger(
        getDividendPayoutGLEntries({
          id: payout.id,
          date: dto.date,
          amount: Number(dto.amount),
          currencyCode,
          equityAccountId: equityAccount.id,
          paymentAccountId: dto.paymentAccountId,
          note: dto.note ?? null,
        }),
      );
      await this.ledgerStorage.commit(ledger, trx);

      return payout;
    });
  }

  /** Equity-счёт «Выплаты собственнику»: find-or-create по slug. */
  private async findOrCreateEquityAccount(
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: OWNER_PAYOUTS_ACCOUNT.slug });

    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({
          ...OWNER_PAYOUTS_ACCOUNT,
          currencyCode,
        } as any);
    }
    return account;
  }
}
