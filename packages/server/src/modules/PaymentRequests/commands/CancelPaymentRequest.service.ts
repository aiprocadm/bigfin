// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { validateStatusTransition } from '../utils/validateStatusTransition';
import { ERRORS } from '../constants';

@Injectable()
export class CancelPaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Отменяет заявку; если она была одобрена и породила плановый отток —
   * отменяет связанную операцию (она уходит из прогноза календаря).
   */
  public async cancel(id: number) {
    const request: any = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    validateStatusTransition(request.status, 'cancelled');

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      if (request.plannedOperationId) {
        await this.operationModel()
          .query(trx)
          .findById(request.plannedOperationId)
          .patch({ status: 'cancelled' } as any);
      }
      return this.requestModel()
        .query(trx)
        .findById(id)
        .patch({ status: 'cancelled' } as any);
    });
  }
}
