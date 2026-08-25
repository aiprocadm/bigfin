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
