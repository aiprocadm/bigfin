// © 2026 Bigfin
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ProfitLossSheetQueryDto } from './ProfitLossSheetQuery.dto';

describe('ProfitLossSheetQueryDto — параметр basis', () => {
  it.each(['cash', 'accrual'])('принимает basis=%s', async (basis) => {
    const dto = plainToInstance(ProfitLossSheetQueryDto, { basis });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('принимает запрос без basis', async () => {
    const dto = plainToInstance(ProfitLossSheetQueryDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });

  // Раньше мусорное значение молча означало «по начислению» — опечатку
  // в интеграции было не заметить.
  it.each(['banana', 'cach', 'CASH'])('отклоняет basis=%s', async (basis) => {
    const dto = plainToInstance(ProfitLossSheetQueryDto, { basis });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
