// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Contact } from '@/modules/Contacts/models/Contact';
import { Employee } from '@/modules/Payroll/models/Employee.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandDealValidatorService {
  constructor(
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,

    // Модель Employee глобально зарегистрирована в Tenancy — импорт модели
    // не тянет PayrollModule и не создаёт DI-цикла (паттерн DealsRevenueService).
    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async validateRefs(dto: {
    contactId?: number;
    managerId?: number | null;
  }) {
    if (
      dto.contactId &&
      !(await this.contactModel().query().findById(dto.contactId))
    ) {
      throw new ServiceError(ERRORS.CONTACT_NOT_FOUND);
    }
    if (
      dto.managerId != null &&
      !(await this.employeeModel().query().findById(dto.managerId))
    ) {
      throw new ServiceError(ERRORS.EMPLOYEE_NOT_FOUND);
    }
  }
}
