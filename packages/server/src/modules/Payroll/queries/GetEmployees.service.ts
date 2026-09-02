// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Employee } from '../models/Employee.model';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';

@Injectable()
export class GetEmployeesService {
  constructor(
    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async getEmployees(activeOnly?: boolean, keyword?: string) {
    const query = this.employeeModel().query().orderBy('fullName');
    if (activeOnly) query.modify('activeOnly');

    applyKeywordSearch(query, Employee.searchColumns, keyword);

    return query;
  }
}
