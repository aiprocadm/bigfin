// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { EmployeeKpiTarget } from '../models/EmployeeKpiTarget.model';
import { EditKpiTargetDto } from '../dtos/KpiTarget.dto';
import { ERRORS } from '../constants';
import { CommandKpiTargetValidatorService } from './CommandKpiTargetValidator.service';

@Injectable()
export class EditKpiTargetService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandKpiTargetValidatorService,

    @Inject(EmployeeKpiTarget.name)
    private readonly targetModel: TenantModelProxy<typeof EmployeeKpiTarget>,
  ) {}

  public async edit(id: number, dto: EditKpiTargetDto) {
    const target = await this.targetModel().query().findById(id);
    if (!target) throw new ServiceError(ERRORS.KPI_TARGET_NOT_FOUND);

    this.validator.validate(dto);
    await this.validator.validateEmployeeExists(dto.employeeId);

    const periodMonth = this.validator.normalizePeriodMonth(dto.periodMonth);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.validator.validateMonthUnique(dto.employeeId, periodMonth, id, trx);

      await this.targetModel()
        .query(trx)
        .findById(id)
        .patch({
          employeeId: dto.employeeId,
          periodMonth,
          metric: dto.metric || 'revenue',
          targetAmount: dto.targetAmount ?? 0,
          bonusRate: dto.bonusRate ?? 0,
          ...(dto.onlyIfAchieved !== undefined
            ? { onlyIfAchieved: dto.onlyIfAchieved }
            : {}),
          ...(dto.note !== undefined ? { note: dto.note || null } : {}),
        } as any);

      return this.targetModel().query(trx).findById(id);
    });
  }
}
