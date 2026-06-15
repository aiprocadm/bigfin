// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { FixedAsset } from '../models/FixedAsset.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetFixedAssetDetailService {
  constructor(
    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,
  ) {}

  public async getDetail(id: number) {
    const asset: any = await this.assetModel()
      .query()
      .findById(id)
      .withGraphFetched('entries(orderBySeq)')
      .modifiers({
        orderBySeq(builder: any) {
          builder.orderBy('seqNo', 'asc');
        },
      });
    if (!asset) throw new ServiceError(ERRORS.FIXED_ASSET_NOT_FOUND);

    const cost = Number(asset.cost) || 0;
    const accumulated = Number(asset.accumulatedDepreciation) || 0;
    return {
      ...asset,
      netValue: Math.round((cost - accumulated) * 100) / 100,
    };
  }
}
