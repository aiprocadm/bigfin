// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { validateStatusTransition } from '../utils/validateStatusTransition';
import { ERRORS } from '../constants';

@Injectable()
export class RejectPaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}

  /**
   * Отклоняет заявку (только из статуса pending).
   */
  public async reject(id: number) {
    const request: any = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    validateStatusTransition(request.status, 'rejected');

    return this.uow.withTransaction(async (trx: Knex.Transaction) =>
      this.requestModel()
        .query(trx)
        .findById(id)
        .patch({ status: 'rejected' } as any),
    );
  }
}
