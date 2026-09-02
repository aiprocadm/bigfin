// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { GetDealsQueryDto } from '../dtos/GetDealsQuery.dto';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';
import { applyListCap, splitCapped } from '@/common/utils/listCap';

@Injectable()
export class GetDealsService {
  constructor(
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async getDeals(filter: GetDealsQueryDto) {
    const rows: any[] = await this.dealModel()
      .query()
      .onBuild((q) => {
        if (filter.status) q.modify('filterByStatus', filter.status);
        applyKeywordSearch(q, Deal.searchColumns, filter.keyword);
        q.orderBy('createdAt', 'desc');
        applyListCap(q);
      });

    // Форма ответа прежняя: `data` — то, что показываем, `truncated` —
    // признак «есть ещё». Витрина берёт `data` и не замечает разницы.
    const { items, truncated } = splitCapped(rows);

    return { data: items, truncated };
  }
}
