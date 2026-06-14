// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class FixedAsset extends TenantBaseModel {
  name!: string;
  category!: string | null;
  cost!: number;
  salvageValue!: number;
  serviceLifeMonths!: number;
  commissionedAt!: string;
  assetAccountId!: number;
  accumulatedDepreciation!: number;
  status!: string;
  disposedAt!: string | null;
  disposalType!: string | null;
  disposalAccountId!: number | null;
  disposalProceeds!: number | null;
  note!: string | null;

  static get tableName() {
    return 'fixed_assets';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const {
      FixedAssetDepreciationEntry,
    } = require('@/modules/FixedAssets/models/FixedAssetDepreciationEntry.model');
    const { Account } = require('@/modules/Accounts/models/Account.model');

    return {
      entries: {
        relation: Model.HasManyRelation,
        modelClass: FixedAssetDepreciationEntry,
        join: {
          from: 'fixed_assets.id',
          to: 'fixed_asset_depreciation_entries.fixedAssetId',
        },
      },
      assetAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: { from: 'fixed_assets.assetAccountId', to: 'accounts.id' },
      },
    };
  }
}
