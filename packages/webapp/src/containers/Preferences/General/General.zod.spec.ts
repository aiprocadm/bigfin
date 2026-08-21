import { describe, it, expect } from 'vitest';
import { generalSchema } from './General.zod';

const valid = {
  name: 'ООО Ромашка',
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

  it('industry/location необязательны', () => {
    expect(
      generalSchema.safeParse({
        ...valid,
        industry: '',
        location: '',
      }).success,
    ).toBe(true);
  });

  it('поля-ловушки tax_number больше нет в схеме (Р2 срез 2)', () => {
    // Поле было подписано «ИНН организации», но колонку tax_number не читает
    // ни одна печатная форма: человек вводил ИНН, видел его сохранённым и
    // был уверен, что всё заполнил. Настоящий ИНН — в секции «Реквизиты».
    expect('tax_number' in generalSchema.shape).toBe(false);
  });
});

/**
 * Р2 срез 1 (карта v16). Девять «российских» реквизитов есть в базе, сервер
 * их принимает и проверяет, ответ их отдаёт — а в интерфейсе не было ни
 * одного поля. По счёту без банка, БИК и расчётного счёта физически нельзя
 * заплатить, а счёт-фактура без ИНН/КПП недействительна для вычета НДС.
 */
describe('generalSchema — реквизиты организации', () => {
  const ok = (patch: Record<string, unknown>) =>
    generalSchema.safeParse({ ...valid, ...patch }).success;

  it('все девять реквизитов необязательны — пустая форма проходит', () => {
    expect(
      ok({
        legal_form: '',
        tax_regime: '',
        inn: '',
        kpp: '',
        ogrn: '',
        bank_name: '',
        bank_bik: '',
        bank_account: '',
        bank_correspondent_account: '',
      }),
    ).toBe(true);
  });

  it('принимает верный ИНН юрлица и ИНН физлица', () => {
    expect(ok({ inn: '7707083893' })).toBe(true);
    expect(ok({ inn: '500100732259' })).toBe(true);
  });

  it('не принимает ИНН с непроходящей контрольной суммой', () => {
    expect(ok({ inn: '1234567890' })).toBe(false);
  });

  it('не принимает ИНН неверной длины', () => {
    expect(ok({ inn: '77070838' })).toBe(false);
  });

  it('проверяет КПП', () => {
    expect(ok({ kpp: '770701001' })).toBe(true);
    expect(ok({ kpp: '77070100' })).toBe(false);
  });

  it('принимает и ОГРН (13 цифр), и ОГРНИП (15) — колонка одна', () => {
    expect(ok({ ogrn: '1027700132195' })).toBe(true);
    expect(ok({ ogrn: '304770000000008' })).toBe(true);
  });

  it('не принимает ОГРН с непроходящей контрольной суммой', () => {
    expect(ok({ ogrn: '1027700132196' })).toBe(false);
  });

  it('проверяет БИК', () => {
    expect(ok({ bank_bik: '044525225' })).toBe(true);
    expect(ok({ bank_bik: '999999999' })).toBe(false);
  });

  it('проверяет расчётный счёт', () => {
    expect(ok({ bank_account: '40702810000000001234' })).toBe(true);
    expect(ok({ bank_account: '4070281000' })).toBe(false);
  });

  it('проверяет корреспондентский счёт', () => {
    expect(ok({ bank_correspondent_account: '30101810400000000225' })).toBe(true);
    expect(ok({ bank_correspondent_account: '40702810000000001234' })).toBe(false);
  });

  it('название банка — свободный текст', () => {
    expect(ok({ bank_name: 'ПАО Сбербанк' })).toBe(true);
  });

  it('пробелы по краям не мешают: «7707083893 » проходит', () => {
    expect(ok({ inn: '7707083893 ' })).toBe(true);
  });
});
