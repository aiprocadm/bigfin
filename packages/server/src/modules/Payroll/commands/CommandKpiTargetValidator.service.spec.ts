// © 2026 Bigfin
import { CommandKpiTargetValidatorService } from './CommandKpiTargetValidator.service';

function makeValidator(opts: { employee?: any; existingTarget?: any } = {}) {
  const employeeModel = () => ({
    query: () => ({ findById: () => Promise.resolve(opts.employee) }),
  });
  const findOneResult: any = {
    whereNot: () => findOneResult,
    then: (resolve: any, reject: any) =>
      Promise.resolve(opts.existingTarget).then(resolve, reject),
  };
  const targetModel = () => ({
    query: () => ({ findOne: () => findOneResult }),
  });
  return new CommandKpiTargetValidatorService(
    employeeModel as any,
    targetModel as any,
  );
}

describe('CommandKpiTargetValidatorService', () => {
  it('пропускает корректный план', () => {
    expect(() =>
      makeValidator().validate({
        metric: 'revenue',
        targetAmount: 1000000,
        bonusRate: 5,
      }),
    ).not.toThrow();
  });

  it('бросает на метрике вне enum', () => {
    expect(() => makeValidator().validate({ metric: 'avg_check' })).toThrow(
      expect.objectContaining({ errorType: 'INVALID_KPI_METRIC' }),
    );
  });

  it('бросает на отрицательном плане', () => {
    expect(() => makeValidator().validate({ targetAmount: -1 })).toThrow(
      expect.objectContaining({ errorType: 'INVALID_AMOUNT' }),
    );
  });

  it('бросает на ставке вне диапазона 0–100', () => {
    expect(() => makeValidator().validate({ bonusRate: 101 })).toThrow(
      expect.objectContaining({ errorType: 'INVALID_BONUS_RATE' }),
    );
    expect(() => makeValidator().validate({ bonusRate: -1 })).toThrow(
      expect.objectContaining({ errorType: 'INVALID_BONUS_RATE' }),
    );
    expect(() => makeValidator().validate({ bonusRate: NaN })).toThrow(
      expect.objectContaining({ errorType: 'INVALID_BONUS_RATE' }),
    );
  });

  it('бросает на несуществующем сотруднике', async () => {
    await expect(
      makeValidator({ employee: undefined }).validateEmployeeExists(9),
    ).rejects.toMatchObject({ errorType: 'EMPLOYEE_NOT_FOUND' });
  });

  it('пропускает существующего сотрудника', async () => {
    await expect(
      makeValidator({ employee: { id: 9 } }).validateEmployeeExists(9),
    ).resolves.toBeUndefined();
  });

  it('бросает на дубле (менеджер, месяц)', async () => {
    await expect(
      makeValidator({ existingTarget: { id: 3 } }).validateMonthUnique(
        1,
        '2026-06-01',
      ),
    ).rejects.toMatchObject({ errorType: 'KPI_TARGET_MONTH_EXISTS' });
  });

  it('пропускает уникальный месяц', async () => {
    await expect(
      makeValidator().validateMonthUnique(1, '2026-06-01'),
    ).resolves.toBeUndefined();
  });

  it('нормализует месяц к первому числу', () => {
    expect(makeValidator().normalizePeriodMonth('2026-06-17')).toBe(
      '2026-06-01',
    );
  });
});
