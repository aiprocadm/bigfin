// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { CommandPaymentRequestValidatorService } from './CommandPaymentRequestValidator.service';
import { CreatePaymentRequestDto } from '../dtos/PaymentRequest.dto';
import { normalizeInstallments, requestDueDate } from '../utils/installments';
import { PaymentRequestInstallmentsService } from './PaymentRequestInstallments.service';

@Injectable()
export class CreatePaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPaymentRequestValidatorService,
    private readonly tenancyContext: TenancyContext,
    private readonly installments: PaymentRequestInstallmentsService,

    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}

  /**
   * Создаёт заявку на оплату в статусе pending от имени текущего пользователя.
   */
  public async create(dto: CreatePaymentRequestDto) {
    await this.validator.validateRefs(dto);
    const user: any = await this.tenancyContext.getSystemUser();
    const { installments = [], asDraft, ...fields } = dto;
    // Оплаты сходятся с суммой, срок — указанный или первая оплата (FT-053).
    const plan = installments.length ? normalizeInstallments(dto.amount, installments) : [];
    const dueDate = requestDueDate(dto.dueDate, installments);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const request: any = await this.requestModel()
        .query(trx)
        .insert({
          ...fields,
          dueDate,
          currencyCode: dto.currencyCode || 'RUB',
          status: asDraft ? 'draft' : 'pending',
          createdBy: user.id,
        } as any);
      await this.installments.replace(request.id, plan, trx);
      return request;
    });
  }
}
