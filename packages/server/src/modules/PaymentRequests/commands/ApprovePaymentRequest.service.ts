// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { validateStatusTransition } from '../utils/validateStatusTransition';
import { ERRORS, PAYMENT_REQUEST_SOURCE } from '../constants';
import { PaymentRequestInstallmentsService } from './PaymentRequestInstallments.service';

@Injectable()
export class ApprovePaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly tenancyContext: TenancyContext,

    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,

    private readonly installments: PaymentRequestInstallmentsService,
  ) {}

  /**
   * Одобряет заявку и в той же транзакции создаёт плановый отток в календаре.
   */
  public async approve(id: number) {
    const request: any = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    validateStatusTransition(request.status, 'approved');
    const user: any = await this.tenancyContext.getSystemUser();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const plannedOutflow = (plannedDate: string, amount: number, accountId: number | null) =>
        this.operationModel()
          .query(trx)
          .insert({
            direction: 'outflow',
            amount,
            currencyCode: request.currencyCode,
            plannedDate,
            articleId: request.articleId,
            accountId,
            branchId: request.branchId,
            contactId: request.contactId,
            status: 'confirmed',
            sourceType: PAYMENT_REQUEST_SOURCE,
            sourceId: request.id,
            description: request.description || `Заявка №${request.id}`,
          } as any) as any;

      // Несколько плановых оплат (FT-053 ТЗ-3) — по плановой операции на
      // каждую: календарь видит, когда и с какого счёта уйдут деньги.
      const installments: any[] = await this.installments.list(id, trx);
      let operation: any;
      if (installments.length > 0) {
        for (const installment of installments) {
          const created: any = await plannedOutflow(
            moment(installment.dueDate).format('YYYY-MM-DD'),
            Number(installment.amount),
            installment.accountId ?? request.accountId,
          );
          await this.installments.linkPlan(installment.id, created.id, trx);
          operation = operation ?? created;
        }
      } else {
        operation = await plannedOutflow(
          moment(request.dueDate).format('YYYY-MM-DD'),
          request.amount,
          request.accountId,
        );
      }

      await this.requestModel()
        .query(trx)
        .findById(id)
        .patch({
          status: 'approved',
          approvedBy: user.id,
          approvedAt: moment().toISOString(),
          plannedOperationId: operation.id,
        } as any);

      return this.requestModel().query(trx).findById(id);
    });
  }
}
