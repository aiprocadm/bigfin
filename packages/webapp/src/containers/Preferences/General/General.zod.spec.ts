import { describe, it, expect } from 'vitest';
import { generalSchema } from './General.zod';

const valid = {
  name: 'ООО Ромашка',
  tax_number: '',
  industry: '',
  location: 'RU',
  base_currency: 'RUB',
  fiscal_year: 'january',
  language: 'ru',
  timezone: 'Europe/Moscow',
  date_format: 'DD/MM/YYYY',
  address: {},
};

describe('generalSchema', () => {
  it('пропускает валидные значения', () => {
    expect(generalSchema.safeParse(valid).success).toBe(true);
  });

  it('требует name', () => {
    expect(generalSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('требует base_currency, fiscal_year, language, timezone, date_format', () => {
    for (const key of [
      'base_currency',
      'fiscal_year',
      'language',
      'timezone',
      'date_format',
    ]) {
      expect(
        generalSchema.safeParse({ ...valid, [key]: '' }).success,
      ).toBe(false);
    }
  });

  it('tax_number/industry/location необязательны', () => {
    expect(
      generalSchema.safeParse({
        ...valid,
        tax_number: '',
        industry: '',
        location: '',
      }).success,
    ).toBe(true);
  });
});
