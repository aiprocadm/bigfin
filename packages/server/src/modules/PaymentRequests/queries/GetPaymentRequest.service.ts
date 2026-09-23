// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetPaymentRequestService {
  constructor(
    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}

  /**
   * Одна заявка по id (или ServiceError, если не найдена).
   */
  public async getPaymentRequest(id: number) {
    // С плановыми оплатами (FT-053 ТЗ-3).
    const request = await this.requestModel().query().findById(id).withGraphFetched('installments');
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    return request;
  }
}
