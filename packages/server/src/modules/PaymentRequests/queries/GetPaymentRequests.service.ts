// © 2026 Bigfin
import { totalsByCurrency } from '../utils/installments';
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { GetPaymentRequestsQueryDto } from '../dtos/GetPaymentRequestsQuery.dto';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';
import { applyListCap, splitCapped } from '@/common/utils/listCap';

@Injectable()
export class GetPaymentRequestsService {
  constructor(
    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
    private readonly tenancyContext?: TenancyContext,
  ) {}

  /**
   * Реестр заявок с опциональным фильтром по статусу, по сроку оплаты.
   */
  public async getPaymentRequests(filter: GetPaymentRequestsQueryDto, onlyOwn = false) {
    // «Только свои» (FT-083 ТЗ-3): фильтр в запросе, а не после него, —
    // иначе итоги по валютам посчитались бы и по чужим заявкам.
    const authorId = onlyOwn ? await this.currentUserId() : null;

    const rows: any[] = await this.requestModel()
      .query()
      .onBuild((q) => {
        if (onlyOwn) q.where('createdBy', authorId ?? -1);
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

  private async currentUserId(): Promise<number | null> {
    const user: any = await this.tenancyContext?.getSystemUser();
    return user?.id ?? null;
  }
}
