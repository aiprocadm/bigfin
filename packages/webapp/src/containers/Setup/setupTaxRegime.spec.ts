import { describe, it, expect, vi } from 'vitest';

vi.mock('react-intl-universal', () => ({
  default: { get: (key: string) => key },
}));

import { getSetupOrganizationValidation } from './SetupOrganization.schema';

/**
 * Н1 карты v22. Мастер создания организации спрашивает налоговый режим —
 * но только у российских организаций: остальным странам это поле не нужно
 * и показываться не должно.
 */
const russianValues = {
  name: 'ООО «Ромашка»',
  location: 'RU',
  baseCurrency: 'RUB',
  language: 'ru',
  fiscalYear: 'january',
  timezone: 'Europe/Moscow',
  interfaceMode: 'business',
  // Н6 карты v22: у российской организации юрформа обязательна, поэтому в
  // «здоровых» значениях она заполнена — иначе проверки режима падали бы
  // из-за неё, а не по делу.
  legalForm: 'OOO',
};

const validate = async (values: Record<string, unknown>) => {
  try {
    await getSetupOrganizationValidation().validate(values, {
      abortEarly: false,
    });
    return [] as string[];
  } catch (error: any) {
    return (error.inner ?? []).map((item: any) => item.path);
  }
};

describe('мастер создания организации: налоговый режим', () => {
  it('у российской организации режим обязателен', async () => {
    await expect(validate(russianValues)).resolves.toContain('taxRegime');
  });

  it('с выбранным режимом форма проходит', async () => {
    await expect(
      validate({ ...russianValues, taxRegime: 'USN_INCOME' }),
    ).resolves.toEqual([]);
  });

  it('у нероссийской организации режим не спрашивается', async () => {
    await expect(
      validate({
        ...russianValues,
        location: 'DE',
        baseCurrency: 'EUR',
        language: 'en',
      }),
    ).resolves.toEqual([]);
  });

  it('выдуманный режим не проходит', async () => {
    await expect(
      validate({ ...russianValues, taxRegime: 'ЧТО-ТО СВОЁ' }),
    ).resolves.toContain('taxRegime');
  });

});

describe('мастер создания организации: юридическая форма (Н6)', () => {
  it('у российской организации форма обязательна', async () => {
    const { legalForm, ...withoutForm } = russianValues;

    await expect(validate(withoutForm)).resolves.toContain('legalForm');
  });

  it('у нероссийской организации форма не спрашивается', async () => {
    const { legalForm, ...withoutForm } = russianValues;

    await expect(
      validate({
        ...withoutForm,
        location: 'DE',
        baseCurrency: 'EUR',
        language: 'en',
        taxRegime: '',
      }),
    ).resolves.toEqual([]);
  });

  it('выдуманная форма не проходит', async () => {
    await expect(
      validate({ ...russianValues, legalForm: 'ТОО' }),
    ).resolves.toContain('legalForm');
  });

  it('пустые поля нероссийской организации не считаются ошибкой', () => {
    // Форма всегда отправляет оба поля; у нероссийской организации они
    // уходят пустыми, потому что не показывались. Раньше `oneOf` считал
    // пустую строку недопустимой, и создать такую организацию было нельзя.
    return expect(
      validate({
        ...russianValues,
        location: 'DE',
        baseCurrency: 'EUR',
        language: 'en',
        taxRegime: '',
        legalForm: '',
      }),
    ).resolves.toEqual([]);
  });
});
