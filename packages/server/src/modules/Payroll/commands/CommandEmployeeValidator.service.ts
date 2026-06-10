// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { EMPLOYMENT_TYPES, ERRORS } from '../constants';

@Injectable()
export class CommandEmployeeValidatorService {
  public validate(dto: {
    fullName?: string;
    employmentType?: string;
    defaultSalary?: number;
  }) {
    if (!dto.fullName || !dto.fullName.trim()) {
      throw new ServiceError(ERRORS.INVALID_FULL_NAME);
    }
    if (!EMPLOYMENT_TYPES.includes(dto.employmentType as any)) {
      throw new ServiceError(ERRORS.INVALID_EMPLOYMENT_TYPE);
    }
    if (dto.defaultSalary != null) {
      const n = Number(dto.defaultSalary);
      if (!Number.isFinite(n) || n < 0) {
        throw new ServiceError(ERRORS.INVALID_AMOUNT);
      }
    }
  }
}
