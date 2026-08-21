import { describe, it, expect } from 'vitest';
import * as Yup from 'yup';
import { contactRequisitesSchemaFields } from './contactRequisites.schema';

/**
 * Р2 срез 3 (карта v16). Колонки и серверные проверки реквизитов контрагента
 * давно есть, а полей в формах клиента и поставщика не было — ИНН попадал в
 * систему только из банковской выписки или импорта 1С. Клиентские валидаторы
 * лежали написанными и не импортировались.
 */
const schema = Yup.object().shape(contactRequisitesSchemaFields());

const ok = (patch: Record<string, unknown>) => schema.isValidSync(patch);

describe('реквизиты контрагента — правила формы', () => {
  it('все поля необязательны — пустой набор проходит', () => {
    expect(
      ok({
        legal_form: '',
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

  it('принимает верный ИНН юрлица и физлица', () => {
    expect(ok({ inn: '7707083893' })).toBe(true);
    expect(ok({ inn: '500100732259' })).toBe(true);
  });

  it('не принимает ИНН с непроходящей контрольной суммой', () => {
    expect(ok({ inn: '1234567890' })).toBe(false);
  });

  it('проверяет КПП', () => {
    expect(ok({ kpp: '770701001' })).toBe(true);
    expect(ok({ kpp: '77070100' })).toBe(false);
  });

  it('принимает и ОГРН (13 цифр), и ОГРНИП (15)', () => {
    expect(ok({ ogrn: '1027700132195' })).toBe(true);
    expect(ok({ ogrn: '304770000000008' })).toBe(true);
    expect(ok({ ogrn: '1027700132196' })).toBe(false);
  });

  it('проверяет БИК', () => {
    expect(ok({ bank_bik: '044525225' })).toBe(true);
    expect(ok({ bank_bik: '994525225' })).toBe(false);
  });

  it('проверяет расчётный и корреспондентский счета', () => {
    expect(ok({ bank_account: '40702810000000001234' })).toBe(true);
    expect(ok({ bank_account: '407028100' })).toBe(false);
    expect(ok({ bank_correspondent_account: '30101810400000000225' })).toBe(true);
    expect(ok({ bank_correspondent_account: '40702810000000001234' })).toBe(false);
  });

  it('юр. форма — только из списка (включая «Физлицо» у контрагента)', () => {
    expect(ok({ legal_form: 'OOO' })).toBe(true);
    expect(ok({ legal_form: 'INDIVIDUAL' })).toBe(true);
    expect(ok({ legal_form: 'ZAO' })).toBe(false);
  });

  it('пробелы по краям не мешают', () => {
    expect(ok({ inn: ' 7707083893 ' })).toBe(true);
  });
});
