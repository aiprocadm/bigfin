// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { CommandRepaymentPlanValidatorService } from './CommandRepaymentPlanValidator.service';
import { CreateRepaymentPlanDto } from '../dtos/RepaymentPlan.dto';

@Injectable()
export class CreateRepaymentPlanService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandRepaymentPlanValidatorService,

    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,
  ) {}

  /**
   * Создаёт план погашения вместе с графиком платежей.
   */
  public async create(dto: CreateRepaymentPlanDto, trx?: Knex.Transaction) {
    await this.validator.validate(dto);
    const totalAmount = dto.installments.reduce(
      (s, i) => s + Number(i.amount),
      0,
    );

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.planModel()
        .query(trx)
        .insertGraph({
          side: dto.side,
          contactId: dto.contactId,
          sourceType: dto.sourceType ?? null,
          sourceId: dto.sourceId ?? null,
          totalAmount,
          currencyCode: dto.currencyCode || 'RUB',
          status: 'active',
          description: dto.description ?? null,
          installments: dto.installments.map((i, idx) => ({
            dueDate: i.dueDate,
            amount: i.amount,
            status: i.status || 'planned',
            note: i.note ?? null,
            sortOrder: idx,
          })),
        } as any);
    }, trx);
  }
}
