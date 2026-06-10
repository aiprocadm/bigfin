// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Employee } from '../models/Employee.model';

@Injectable()
export class GetEmployeesService {
  constructor(
    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async getEmployees(activeOnly?: boolean) {
    const query = this.employeeModel().query().orderBy('fullName');
    if (activeOnly) query.modify('activeOnly');
    return query;
  }
}
