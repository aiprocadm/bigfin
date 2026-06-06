// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { GetDealsQueryDto } from '../dtos/GetDealsQuery.dto';

@Injectable()
export class GetDealsService {
  constructor(
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public getDeals(filter: GetDealsQueryDto) {
    return this.dealModel()
      .query()
      .onBuild((q) => {
        if (filter.status) q.modify('filterByStatus', filter.status);
        q.orderBy('createdAt', 'desc');
      });
  }
}
