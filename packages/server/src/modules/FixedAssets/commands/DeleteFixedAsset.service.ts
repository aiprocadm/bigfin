// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { FixedAsset } from '../models/FixedAsset.model';
import { FixedAssetDepreciationEntry } from '../models/FixedAssetDepreciationEntry.model';
import {
  ERRORS,
  FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE,
  FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE,
} from '../constants';

@Injectable()
export class DeleteFixedAssetService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,

    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,

    @Inject(FixedAssetDepreciationEntry.name)
    private readonly entryModel: TenantModelProxy<
      typeof FixedAssetDepreciationEntry
    >,
  ) {}

  public async delete(id: number) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const asset: any = await this.assetModel().query(trx).findById(id);
      if (!asset) throw new ServiceError(ERRORS.FIXED_ASSET_NOT_FOUND);

      const posted: any[] = await this.entryModel()
        .query(trx)
        .where('fixedAssetId', id)
        .andWhere('status', 'posted');

      for (const entry of posted) {
        await this.ledgerStorage.deleteByReference(
          entry.id,
          FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE,
          trx,
        );
      }

      if (asset.status === 'disposed') {
        await this.ledgerStorage.deleteByReference(
          id,
          FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE,
          trx,
        );
      }

      await this.entryModel().query(trx).where('fixedAssetId', id).delete();
      await this.assetModel().query(trx).deleteById(id);
      return { id };
    });
  }
}
