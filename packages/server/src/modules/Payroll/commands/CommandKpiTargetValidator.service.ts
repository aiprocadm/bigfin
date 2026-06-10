// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Employee } from '../models/Employee.model';
import { EmployeeKpiTarget } from '../models/EmployeeKpiTarget.model';
import { ERRORS, KPI_METRICS } from '../constants';

@Injectable()
export class CommandKpiTargetValidatorService {
  constructor(
    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,

    @Inject(EmployeeKpiTarget.name)
    private readonly targetModel: TenantModelProxy<typeof EmployeeKpiTarget>,
  ) {}

  /** Нормализует месяц плана к первому числу. */
  public normalizePeriodMonth(periodMonth: string): string {
    return moment(periodMonth).startOf('month').format('YYYY-MM-DD');
  }

  /** Скалярные поля: метрика из enum, план ≥ 0, ставка 0–100. */
  public validate(dto: {
    metric?: string;
    targetAmount?: number;
    bonusRate?: number;
  }) {
    if (dto.metric != null && !KPI_METRICS.includes(dto.metric as any)) {
      throw new ServiceError(ERRORS.INVALID_KPI_METRIC);
    }
    const target = Number(dto.targetAmount ?? 0);
    if (!Number.isFinite(target) || target < 0) {
      throw new ServiceError(ERRORS.INVALID_AMOUNT);
    }
    const rate = Number(dto.bonusRate ?? 0);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new ServiceError(ERRORS.INVALID_BONUS_RATE);
    }
  }

  /** Менеджер должен существовать. */
  public async validateEmployeeExists(employeeId: number) {
    const employee = await this.employeeModel().query().findById(employeeId);
    if (!employee) throw new ServiceError(ERRORS.EMPLOYEE_NOT_FOUND);
  }

  /** Один план на менеджера на месяц (unique employee_id + period_month). */
  public async validateMonthUnique(
    employeeId: number,
    periodMonth: string,
    excludeId?: number,
    trx?: any,
  ) {
    const query = this.targetModel()
      .query(trx)
      .findOne({ employeeId, periodMonth });
    if (excludeId != null) query.whereNot('id', excludeId);

    const existing = await query;
    if (existing) throw new ServiceError(ERRORS.KPI_TARGET_MONTH_EXISTS);
  }
}
