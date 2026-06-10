// © 2026 Bigfin
import { CommandEmployeeValidatorService } from './CommandEmployeeValidator.service';

describe('CommandEmployeeValidatorService', () => {
  const v = new CommandEmployeeValidatorService();

  it('пропускает корректного сотрудника', () => {
    expect(() =>
      v.validate({ fullName: 'Иванова М.', employmentType: 'staff', defaultSalary: 100000 }),
    ).not.toThrow();
  });

  it('бросает на пустом ФИО', () => {
    expect(() =>
      v.validate({ fullName: '   ', employmentType: 'staff' }),
    ).toThrow(expect.objectContaining({ errorType: 'INVALID_FULL_NAME' }));
  });

  it('бросает на неизвестном типе занятости', () => {
    expect(() =>
      v.validate({ fullName: 'Иванова М.', employmentType: 'freelancer' }),
    ).toThrow(expect.objectContaining({ errorType: 'INVALID_EMPLOYMENT_TYPE' }));
  });

  it('бросает на отрицательном окладе', () => {
    expect(() =>
      v.validate({ fullName: 'Иванова М.', employmentType: 'staff', defaultSalary: -1 }),
    ).toThrow(expect.objectContaining({ errorType: 'INVALID_AMOUNT' }));
  });
});
