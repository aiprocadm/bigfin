// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { CommandPaymentRequestValidatorService } from './CommandPaymentRequestValidator.service';
import { CreatePaymentRequestDto } from '../dtos/PaymentRequest.dto';

@Injectable()
export class CreatePaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPaymentRequestValidatorService,
    private readonly tenancyContext: TenancyContext,

    @Inject(PaymentRequest.name)
    private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}

  /**
   * Создаёт заявку на оплату в статусе pending от имени текущего пользователя.
   */
  public async create(dto: CreatePaymentRequestDto) {
    await this.validator.validateRefs(dto);
    const user: any = await this.tenancyContext.getSystemUser();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.requestModel()
        .query(trx)
        .insert({
          ...dto,
          currencyCode: dto.currencyCode || 'RUB',
          status: 'pending',
          createdBy: user.id,
        } as any);
    });
  }
}
