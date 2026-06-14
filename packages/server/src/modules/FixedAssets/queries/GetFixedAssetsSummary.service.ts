// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { FixedAsset } from '../models/FixedAsset.model';

@Injectable()
export class GetFixedAssetsSummaryService {
  constructor(
    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,
  ) {}

  public async getSummary() {
    const assets: any[] = await this.assetModel()
      .query()
      .where('status', 'active');
    const totalCost = assets.reduce((s, a) => s + Number(a.cost), 0);
    const totalAccumulated = assets.reduce(
      (s, a) => s + Number(a.accumulatedDepreciation),
      0,
    );
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return {
      count: assets.length,
      totalCost: r2(totalCost),
      totalAccumulated: r2(totalAccumulated),
      totalNet: r2(totalCost - totalAccumulated),
    };
  }
}
