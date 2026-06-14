// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class FixedAssetDepreciationEntry extends TenantBaseModel {
  fixedAssetId!: number;
  period!: string;
  seqNo!: number;
  amount!: number;
  status!: string;
  postedAt!: string | null;

  static get tableName() {
    return 'fixed_asset_depreciation_entries';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const {
      FixedAsset,
    } = require('@/modules/FixedAssets/models/FixedAsset.model');
    return {
      fixedAsset: {
        relation: Model.BelongsToOneRelation,
        modelClass: FixedAsset,
        join: {
          from: 'fixed_asset_depreciation_entries.fixedAssetId',
          to: 'fixed_assets.id',
        },
      },
    };
  }
}
