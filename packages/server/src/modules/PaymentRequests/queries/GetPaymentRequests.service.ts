// © 2026 Bigfin
import { totalsByCurrency } from '../utils/installments';
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { GetPaymentRequestsQueryDto } from '../dtos/GetPaymentRequestsQuery.dto';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';
import { applyListCap, splitCapped } from '@/common/utils/listCap';

@Injectable()
export class GetPaymentRequestsService {
  constructor(
    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}

  /**
   * Реестр заявок с опциональным фильтром по статусу, по сроку оплаты.
   */
  public async getPaymentRequests(filter: GetPaymentRequestsQueryDto) {
    const rows: any[] = await this.requestModel()
      .query()
      .onBuild((q) => {
        if (filter.status) q.modify('filterByStatus', filter.status);
        applyKeywordSearch(q, PaymentRequest.searchColumns, filter.keyword);
        q.orderBy('dueDate', 'asc');
        applyListCap(q);
      });

    // Форма ответа прежняя: `data` — то, что показываем, `truncated` —
    // признак «есть ещё». Витрина берёт `data` и не замечает разницы.
    const { items, truncated } = splitCapped(rows);

    // Итоги по каждой валюте (FT-053 ТЗ-3): суммы разных валют не
    // складываются — «100 ₽ + 50 $» не число.
    return { data: items, truncated, totals: totalsByCurrency(items as any[]) };
  }
}
