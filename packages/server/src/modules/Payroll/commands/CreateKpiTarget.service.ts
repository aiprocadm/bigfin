// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { EmployeeKpiTarget } from '../models/EmployeeKpiTarget.model';
import { CreateKpiTargetDto } from '../dtos/KpiTarget.dto';
import { CommandKpiTargetValidatorService } from './CommandKpiTargetValidator.service';

@Injectable()
export class CreateKpiTargetService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandKpiTargetValidatorService,

    @Inject(EmployeeKpiTarget.name)
    private readonly targetModel: TenantModelProxy<typeof EmployeeKpiTarget>,
  ) {}

  public async create(dto: CreateKpiTargetDto) {
    this.validator.validate(dto);
    await this.validator.validateEmployeeExists(dto.employeeId);

    const periodMonth = this.validator.normalizePeriodMonth(dto.periodMonth);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.validator.validateMonthUnique(dto.employeeId, periodMonth, undefined, trx);

      return this.targetModel()
        .query(trx)
        .insert({
          employeeId: dto.employeeId,
          periodMonth,
          metric: dto.metric || 'revenue',
          targetAmount: dto.targetAmount ?? 0,
          bonusRate: dto.bonusRate ?? 0,
          onlyIfAchieved: dto.onlyIfAchieved ?? false,
          note: dto.note || null,
        } as any);
    });
  }
}
