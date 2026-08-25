import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BuildOrganizationDto } from './dtos/Organization.dto';
import { TaxRegime } from '@/modules/RussianLegalAttributes/constants';

/**
 * Н1 карты v22. Мастер создания организации спрашивает налоговый режим.
 *
 * Раньше режим не спрашивали нигде, кроме «Настроек», и он оставался пустым
 * у всех организаций: у демо-организации стенда `tax_regime` пуст. Пустой
 * режим — это продукт, который не знает, платит ли предприниматель НДС,
 * хотя это первое, что нужно знать о российском бизнесе.
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

describe('мастер создания организации: налоговый режим', () => {
  it('принимает режим упрощёнки', async () => {
    await expect(
      validateDto({ ...baseDto, taxRegime: TaxRegime.USN_INCOME }),
    ).resolves.toEqual([]);
  });

  it('принимает каждый из режимов, которые показывает продукт', async () => {
    for (const regime of Object.values(TaxRegime)) {
      await expect(
        validateDto({ ...baseDto, taxRegime: regime }),
      ).resolves.toEqual([]);
    }
  });

  it('без режима создать организацию по-прежнему можно', async () => {
    // Страны, кроме России, режим не выбирают — поле необязательное.
    await expect(validateDto(baseDto)).resolves.toEqual([]);
  });

  it('выдуманный режим не принимается', async () => {
    await expect(
      validateDto({ ...baseDto, taxRegime: 'ЧТО-ТО СВОЁ' }),
    ).resolves.toEqual(['taxRegime']);
  });
});
