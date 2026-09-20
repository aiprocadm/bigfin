// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { GetDealsQueryDto } from '../dtos/GetDealsQuery.dto';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';
import { applyListCap, splitCapped } from '@/common/utils/listCap';
import { GetDealsProgressService } from './GetDealsProgress.service';

@Injectable()
export class GetDealsService {
  constructor(
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,

    private readonly progressService: GetDealsProgressService,
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

    // «Оплачено, %» и «Отгружено, %» (FIN-024). Считаются на весь список
    // двумя запросами — по одному на каждый вопрос, а не по запросу на
    // строку. Сбой не роняет список: сделки важнее двух колонок.
    const progress = await this.safeProgress(items);

    return {
      data: items.map((deal) => ({
        ...deal,
        ...(progress.get(Number(deal.id)) ?? {
          paidRatio: null,
          shippedRatio: null,
          flags: [],
        }),
      })),
      truncated,
    };
  }

  /** Прогресс не обязан быть: без него список сделок остаётся списком. */
  private async safeProgress(items: any[]) {
    try {
      return await this.progressService.getProgress(items);
    } catch {
      return new Map();
    }
  }
}
