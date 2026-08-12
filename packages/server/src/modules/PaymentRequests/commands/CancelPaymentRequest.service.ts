// © 2026 Bigfin
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
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

    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Отменяет заявку; если она была одобрена и породила плановый отток —
   * отменяет связанную операцию (она уходит из прогноза календаря).
   *
   * Отменить может автор заявки — или тот, кто заявки одобряет. Правом такое
   * не описать: дело не в том, что человеку доверено вообще, а в том, чья это
   * заявка. Раньше проверки не было совсем, и любой участник отменял чужую.
   *
   * @param canManageAll - есть ли у запросившего полные права (он же одобряет).
   */
  public async cancel(id: number, canManageAll = false) {
    const request: any = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);

    if (!canManageAll) {
      const user: any = await this.tenancyContext.getSystemUser();

      if (request.createdBy !== user?.id) {
        throw new ForbiddenException(
          'Only the author of the payment request or an administrator can cancel it',
        );
      }
    }

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
