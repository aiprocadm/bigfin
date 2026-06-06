// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { GetPaymentRequestsQueryDto } from '../dtos/GetPaymentRequestsQuery.dto';

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
        q.orderBy('dueDate', 'asc');
      });
  }
}
