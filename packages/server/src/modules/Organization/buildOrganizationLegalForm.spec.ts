import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BuildOrganizationDto } from './dtos/Organization.dto';
import { LegalForm } from '@/modules/RussianLegalAttributes/constants';

/**
 * Н6 карты v22. Мастер создания организации спрашивает юридическую форму.
 *
 * От неё зависят печатные формы: у ИП и самозанятого счёт-фактура
 * подписывается иначе, чем у ООО (где печатаются «Руководитель» и
 * «Главный бухгалтер»). Пока форму не спрашивали, продукт угадывал её по
 * длине ИНН — а ИНН при создании тоже не спрашивают, так что у новой
 * организации не было ни того, ни другого.
 */
const baseDto = {
  name: 'ООО «Ромашка»',
  location: 'RU',
  baseCurrency: 'RUB',
  timezone: 'Europe/Moscow',
  fiscalYear: 'january',
  language: 'ru',
};

const validateDto = async (payload: Record<string, unknown>) => {
  const dto = plainToInstance(BuildOrganizationDto, payload);
  const errors = await validate(dto as object);

  return errors.map((error) => error.property);
};

describe('мастер создания организации: юридическая форма', () => {
  it('принимает форму общества с ограниченной ответственностью', async () => {
    await expect(
      validateDto({ ...baseDto, legalForm: LegalForm.OOO }),
    ).resolves.toEqual([]);
  });

  it('принимает формы, которые продукт предлагает организациям', async () => {
    // INDIVIDUAL — только для контрагентов-физлиц, у организации её быть
    // не должно: это отдельная проверка ниже.
    for (const form of [
      LegalForm.OOO,
      LegalForm.IP,
      LegalForm.NPD,
      LegalForm.AO,
    ]) {
      await expect(
        validateDto({ ...baseDto, legalForm: form }),
      ).resolves.toEqual([]);
    }
  });

  it('без формы создать организацию по-прежнему можно', async () => {
    // Страны, кроме России, юрформу не выбирают — поле необязательное.
    await expect(validateDto(baseDto)).resolves.toEqual([]);
  });

  it('выдуманная форма не принимается', async () => {
    await expect(
      validateDto({ ...baseDto, legalForm: 'ТОО' }),
    ).resolves.toEqual(['legalForm']);
  });
});
