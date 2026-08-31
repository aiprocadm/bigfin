// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { GetPaymentRequestsQueryDto } from '../dtos/GetPaymentRequestsQuery.dto';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';

@Injectable()
export class GetPaymentRequestsService {
  constructor(
    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}

  /**
   * Реестр заявок с опциональным фильтром по статусу, по сроку оплаты.
   */
  public getPaymentRequests(filter: GetPaymentRequestsQueryDto) {
    return this.requestModel()
      .query()
      .onBuild((q) => {
        if (filter.status) q.modify('filterByStatus', filter.status);
        applyKeywordSearch(q, PaymentRequest.searchColumns, filter.keyword);
        q.orderBy('dueDate', 'asc');
      });
  }
}
