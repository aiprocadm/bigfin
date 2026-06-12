import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BuildOrganizationDto, UpdateOrganizationDto } from './Organization.dto';
import { ACCEPTED_LOCALES } from '../Organization.constants';
import { ACCEPTED_LOCALES as ACCEPTED_LOCALES_DUPLICATE } from '../Organization/constants';

const validRussianOrg = {
  name: 'ООО «Ромашка»',
  location: 'RU',
  baseCurrency: 'RUB',
  timezone: 'Europe/Moscow',
  fiscalYear: 'january',
  language: 'ru',
};

describe('Organization DTO — язык организации', () => {
  it('принимает language=ru при создании организации', async () => {
    const dto = plainToInstance(BuildOrganizationDto, validRussianOrg);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('принимает language=ru при обновлении организации', async () => {
    const dto = plainToInstance(UpdateOrganizationDto, { language: 'ru' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('отклоняет неизвестный язык', async () => {
    const dto = plainToInstance(BuildOrganizationDto, {
      ...validRussianOrg,
      language: 'xx',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('дубликат константы не расходится с основной', () => {
    expect(ACCEPTED_LOCALES_DUPLICATE).toEqual(ACCEPTED_LOCALES);
    expect(ACCEPTED_LOCALES).toContain('ru');
  });
});
