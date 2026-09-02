// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { FixedAsset } from '../models/FixedAsset.model';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';
import { GetFixedAssetsQueryDto } from '../dtos/GetFixedAssetsQuery.dto';
import { applyListCap, splitCapped } from '@/common/utils/listCap';

@Injectable()
export class GetFixedAssetsService {
  constructor(
    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,
  ) {}

  public async getFixedAssets(filter: GetFixedAssetsQueryDto = {}) {
    const query = this.assetModel().query();

    applyKeywordSearch(query, FixedAsset.searchColumns, filter.keyword);

    applyListCap(query);

    const rows: any[] = await query
      .orderBy('commissionedAt', 'desc')
      .orderBy('id', 'desc');

    const { items: assets, truncated } = splitCapped(rows);

    const data = assets.map((a) => {
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

    // Форма ответа прежняя: `data` — то, что показываем, `truncated` —
    // признак «есть ещё». Витрина берёт `data` и не замечает разницы.
    return { data, truncated };
  }
}
