// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Employee } from '../models/Employee.model';
import { EditEmployeeDto } from '../dtos/Employee.dto';
import { ERRORS } from '../constants';
import { CommandEmployeeValidatorService } from './CommandEmployeeValidator.service';

@Injectable()
export class EditEmployeeService {
  constructor(
    private readonly validator: CommandEmployeeValidatorService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async edit(id: number, dto: EditEmployeeDto) {
    const employee = await this.employeeModel().query().findById(id);
    if (!employee) throw new ServiceError(ERRORS.EMPLOYEE_NOT_FOUND);

    this.validator.validate(dto);

    await this.employeeModel()
      .query()
      .findById(id)
      .patch({
        fullName: dto.fullName.trim(),
        employmentType: dto.employmentType,
        ...(dto.position !== undefined ? { position: dto.position || null } : {}),
        ...(dto.defaultSalary !== undefined ? { defaultSalary: dto.defaultSalary } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.note !== undefined ? { note: dto.note || null } : {}),
      } as any);

    return this.employeeModel().query().findById(id);
  }
}
