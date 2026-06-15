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
import { TransactionsLockingGuard } from '@/modules/TransactionsLocking/guards/TransactionsLockingGuard';
import { TransactionsLockingGroup } from '@/modules/TransactionsLocking/types/TransactionsLocking.types';
import { FixedAsset } from '../models/FixedAsset.model';
import { getDisposalGLEntries } from '../utils/fixedAssetGLEntries';
import {
  ERRORS,
  CASH_ACCOUNT_TYPES,
  ACCUMULATED_DEPRECIATION_ACCOUNT,
  FIXED_ASSET_DISPOSAL_ACCOUNT,
} from '../constants';
import { DisposeFixedAssetDto } from '../dtos/FixedAsset.dto';

@Injectable()
export class DisposeFixedAssetService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,
    private readonly lockingGuard: TransactionsLockingGuard,

    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async dispose(id: number, dto: DisposeFixedAssetDto) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const asset: any = await this.assetModel().query(trx).findById(id);
      if (!asset) throw new ServiceError(ERRORS.FIXED_ASSET_NOT_FOUND);
      if (asset.status === 'disposed') {
        throw new ServiceError(ERRORS.ALREADY_DISPOSED);
      }

      await this.lockingGuard.transactionsLockingGuard(
        dto.disposedAt,
        TransactionsLockingGroup.Financial,
      );

      const proceeds = Number(dto.proceeds ?? 0);
      let bankAccountId: number | null = null;
      if (dto.disposalType === 'sale' && proceeds > 0) {
        const bank: any = await this.accountModel()
          .query(trx)
          .findById(dto.paymentAccountId);
        if (!bank) throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_FOUND);
        if (!CASH_ACCOUNT_TYPES.includes(bank.accountType)) {
          throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_CASH);
        }
        bankAccountId = bank.id;
      }

      const accumulatedAccount = await this.findOrCreate(
        ACCUMULATED_DEPRECIATION_ACCOUNT,
        currencyCode,
        trx,
      );
      const disposalAccount = await this.findOrCreate(
        FIXED_ASSET_DISPOSAL_ACCOUNT,
        currencyCode,
        trx,
      );

      const ledger = new Ledger(
        getDisposalGLEntries({
          assetId: asset.id,
          date: dto.disposedAt,
          currencyCode,
          cost: Number(asset.cost),
          accumulated: Number(asset.accumulatedDepreciation),
          proceeds,
          assetAccountId: asset.assetAccountId,
          accumulatedAccountId: accumulatedAccount.id,
          disposalAccountId: disposalAccount.id,
          bankAccountId,
        }),
      );
      await this.ledgerStorage.commit(ledger, trx);

      await this.assetModel()
        .query(trx)
        .findById(id)
        .patch({
          status: 'disposed',
          disposedAt: dto.disposedAt,
          disposalType: dto.disposalType,
          disposalAccountId: bankAccountId,
          disposalProceeds: proceeds,
        } as any);

      return this.assetModel().query(trx).findById(id);
    });
  }

  private async findOrCreate(
    template: { slug: string },
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: template.slug });
    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({ ...template, currencyCode } as any);
    }
    return account;
  }
}
