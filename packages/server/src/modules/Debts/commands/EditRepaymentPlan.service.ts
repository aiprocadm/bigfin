// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { DebtRepaymentInstallment } from '../models/DebtRepaymentInstallment.model';
import { CommandRepaymentPlanValidatorService } from './CommandRepaymentPlanValidator.service';
import { EditRepaymentPlanDto } from '../dtos/RepaymentPlan.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditRepaymentPlanService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandRepaymentPlanValidatorService,

    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,

    @Inject(DebtRepaymentInstallment.name)
    private readonly installmentModel: TenantModelProxy<
      typeof DebtRepaymentInstallment
    >,
  ) {}

  /**
   * Обновляет план и переинсертит график (удаляет старые строки, вставляет новые).
   */
  public async edit(id: number, dto: EditRepaymentPlanDto) {
    await this.validator.validate(dto);
    const existing = await this.planModel().query().findById(id);
    if (!existing) throw new ServiceError(ERRORS.REPAYMENT_PLAN_NOT_FOUND);
    const totalAmount = dto.installments.reduce(
      (s, i) => s + Number(i.amount),
      0,
    );

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.planModel()
        .query(trx)
        .findById(id)
        .patch({
          side: dto.side,
          contactId: dto.contactId,
          sourceType: dto.sourceType ?? null,
          sourceId: dto.sourceId ?? null,
          totalAmount,
          currencyCode: dto.currencyCode || existing.currencyCode,
          description: dto.description ?? null,
        } as any);

      await this.installmentModel().query(trx).where('planId', id).delete();
      await this.installmentModel()
        .query(trx)
        .insert(
          dto.installments.map((i, idx) => ({
            planId: id,
            dueDate: i.dueDate,
            amount: i.amount,
            status: i.status || 'planned',
            note: i.note ?? null,
            sortOrder: idx,
          })) as any,
        );

      return this.planModel()
        .query(trx)
        .findById(id)
        .withGraphFetched('installments');
    });
  }
}
