// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';
import { PayrollRunLineDto } from '../dtos/PayrollRun.dto';

@Injectable()
export class CommandPayrollRunValidatorService {
  /** Строки: суммы конечные и неотрицательные, сотрудники без дублей. */
  public validateLines(lines: PayrollRunLineDto[]) {
    const seen = new Set<number>();

    for (const line of lines) {
      if (seen.has(line.employeeId)) {
        throw new ServiceError(ERRORS.DUPLICATE_EMPLOYEE_LINES);
      }
      seen.add(line.employeeId);

      for (const amount of [
        line.baseAmount,
        line.bonusAmount ?? 0,
        line.deductionAmount ?? 0,
      ]) {
        const n = Number(amount);
        if (!Number.isFinite(n) || n < 0) {
          throw new ServiceError(ERRORS.INVALID_AMOUNT);
        }
      }
    }
  }

  /** Мутации допустимы только в черновике. */
  public validateDraft(run: { status: string }) {
    if (run.status !== 'draft') {
      throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_DRAFT);
    }
  }
}
