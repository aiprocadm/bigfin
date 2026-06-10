// © 2026 Bigfin
import { CommandPayrollRunValidatorService } from './CommandPayrollRunValidator.service';

describe('CommandPayrollRunValidatorService', () => {
  const v = new CommandPayrollRunValidatorService();

  it('пропускает корректные строки', () => {
    expect(() =>
      v.validateLines([
        { employeeId: 1, baseAmount: 100000, bonusAmount: 0, deductionAmount: 0 },
        { employeeId: 2, baseAmount: 50000 },
      ]),
    ).not.toThrow();
  });

  it('бросает на дубле сотрудника в строках', () => {
    expect(() =>
      v.validateLines([
        { employeeId: 1, baseAmount: 1 },
        { employeeId: 1, baseAmount: 2 },
      ]),
    ).toThrow(expect.objectContaining({ errorType: 'DUPLICATE_EMPLOYEE_LINES' }));
  });

  it('бросает на отрицательной/нечисловой сумме', () => {
    expect(() => v.validateLines([{ employeeId: 1, baseAmount: -5 }])).toThrow(
      expect.objectContaining({ errorType: 'INVALID_AMOUNT' }),
    );
    expect(() =>
      v.validateLines([{ employeeId: 1, baseAmount: 'x' as any }]),
    ).toThrow(expect.objectContaining({ errorType: 'INVALID_AMOUNT' }));
  });

  it('validateDraft бросает, если статус не draft', () => {
    expect(() => v.validateDraft({ status: 'approved' } as any)).toThrow(
      expect.objectContaining({ errorType: 'PAYROLL_RUN_NOT_DRAFT' }),
    );
    expect(() => v.validateDraft({ status: 'draft' } as any)).not.toThrow();
  });
});
