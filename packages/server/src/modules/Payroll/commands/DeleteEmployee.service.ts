// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Employee } from '../models/Employee.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteEmployeeService {
  constructor(
    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,
  ) {}

  /** Удаление запрещено при наличии строк начислений — фронт предложит архивировать. */
  public async delete(id: number) {
    const employee = await this.employeeModel().query().findById(id);
    if (!employee) throw new ServiceError(ERRORS.EMPLOYEE_NOT_FOUND);

    const usedCount = await this.lineModel()
      .query()
      .where('employeeId', id)
      .resultSize();
    if (usedCount > 0) {
      throw new ServiceError(ERRORS.EMPLOYEE_HAS_PAYROLL_LINES);
    }
    await this.employeeModel().query().deleteById(id);
  }
}
