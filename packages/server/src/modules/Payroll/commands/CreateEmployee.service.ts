// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Employee } from '../models/Employee.model';
import { CreateEmployeeDto } from '../dtos/Employee.dto';
import { CommandEmployeeValidatorService } from './CommandEmployeeValidator.service';

@Injectable()
export class CreateEmployeeService {
  constructor(
    private readonly validator: CommandEmployeeValidatorService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async create(dto: CreateEmployeeDto) {
    this.validator.validate(dto);

    return this.employeeModel()
      .query()
      .insert({
        fullName: dto.fullName.trim(),
        position: dto.position || null,
        employmentType: dto.employmentType,
        defaultSalary: dto.defaultSalary ?? 0,
        active: dto.active ?? true,
        note: dto.note || null,
      } as any);
  }
}
