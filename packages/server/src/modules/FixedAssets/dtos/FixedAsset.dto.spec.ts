// © 2026 Bigfin
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AccrueMonthDto } from './FixedAsset.dto';

describe('AccrueMonthDto — формат периода', () => {
  it('принимает месяц YYYY-MM', async () => {
    const dto = plainToInstance(AccrueMonthDto, { period: '2026-04' });
    expect(await validate(dto)).toHaveLength(0);
  });

  // Период сравнивается как строка: без проверки формата 'abc' оказался бы
  // «больше» любого месяца и начислил бы весь график разом (приёмка ㉑).
  it.each(['abc', '2099', '2026-13', '2026-00', '2026-04-01', ''])(
    'отклоняет «%s»',
    async (period) => {
      const dto = plainToInstance(AccrueMonthDto, { period });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    },
  );
});
