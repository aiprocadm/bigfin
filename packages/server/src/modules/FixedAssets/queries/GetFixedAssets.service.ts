// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { FixedAsset } from '../models/FixedAsset.model';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';
import { GetFixedAssetsQueryDto } from '../dtos/GetFixedAssetsQuery.dto';

@Injectable()
export class GetFixedAssetsService {
  constructor(
    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,
  ) {}

  public async getFixedAssets(filter: GetFixedAssetsQueryDto = {}) {
    const query = this.assetModel().query();

    applyKeywordSearch(query, FixedAsset.searchColumns, filter.keyword);

    const assets: any[] = await query
      .orderBy('commissionedAt', 'desc')
      .orderBy('id', 'desc');

    return assets.map((a) => {
      const cost = Number(a.cost) || 0;
      const accumulated = Number(a.accumulatedDepreciation) || 0;
      return {
        id: a.id,
        name: a.name,
        category: a.category ?? null,
        cost,
        accumulatedDepreciation: accumulated,
        netValue: Math.round((cost - accumulated) * 100) / 100,
        commissionedAt: a.commissionedAt,
        serviceLifeMonths: a.serviceLifeMonths,
        status: a.status,
      };
    });
  }
}
