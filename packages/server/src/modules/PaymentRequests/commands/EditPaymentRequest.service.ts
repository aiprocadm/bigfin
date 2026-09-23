// © 2026 Bigfin
import { ForbiddenException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ERRORS } from '../constants';
import { EditPaymentRequestDto } from '../dtos/PaymentRequest.dto';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { normalizeInstallments, requestDueDate } from '../utils/installments';
import { validateStatusTransition } from '../utils/validateStatusTransition';
import { CommandPaymentRequestValidatorService } from './CommandPaymentRequestValidator.service';
import { PaymentRequestInstallmentsService } from './PaymentRequestInstallments.service';

/**
 * Правка черновика и отправка на согласование (FT-053 ТЗ-3). Править можно
 * только черновик и только автору: заявку «на согласовании» согласующий
 * должен видеть той, какую ему отдали.
 */
@Injectable()
export class EditPaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly tenancyContext: TenancyContext,
    private readonly validator: CommandPaymentRequestValidatorService,
    private readonly installments: PaymentRequestInstallmentsService,
    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}

  private async ownDraft(id: number) {
    const request: any = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    const user: any = await this.tenancyContext.getSystemUser();
    if (request.createdBy !== user?.id) {
      throw new ForbiddenException('Only the author can change a draft payment request');
    }
    return request;
  }

  public async edit(id: number, dto: EditPaymentRequestDto) {
    const request = await this.ownDraft(id);
    if (request.status !== 'draft') {
      throw new ServiceError(
        ERRORS.NOT_EDITABLE,
        'Править можно только черновик заявки',
        { status: request.status },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.validator.validateRefs(dto);
    const { installments = [], asDraft, ...fields } = dto;
    const plan = installments.length ? normalizeInstallments(dto.amount, installments) : [];
    const dueDate = requestDueDate(dto.dueDate, installments);
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.requestModel()
        .query(trx)
        .findById(id)
        .patch({
          ...fields,
          dueDate,
          currencyCode: dto.currencyCode || request.currencyCode || 'RUB',
          status: asDraft === false ? 'pending' : 'draft',
        } as any);
      await this.installments.replace(id, plan, trx);
      return this.requestModel().query(trx).findById(id);
    });
  }

  /** Отправить черновик на согласование. */
  public async submit(id: number) {
    const request = await this.ownDraft(id);
    validateStatusTransition(request.status, 'pending');
    await this.requestModel().query().findById(id).patch({ status: 'pending' } as any);
    return this.requestModel().query().findById(id);
  }
}
