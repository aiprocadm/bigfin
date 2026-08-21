// © 2026 Bigfin
import { snakeToCamel } from '@/common/interceptors/serialize.interceptor';
import { ValidationPipe } from '@/common/pipes/ClassValidation.pipe';
import { CreateCustomerDto } from './CreateCustomer.dto';
import { EditCustomerDto } from './EditCustomer.dto';

/**
 * Р2 срез 3 (карта v16). ИНН/КПП/ОГРН клиента уже проверялись контрольной
 * суммой, а банковская тройка (БИК, р/с, к/с) — нет: только `@MaxLength`.
 * Реквизиты уезжают в платёжные документы, где опечатка стоит денег.
 */
describe.each([
  ['CreateCustomerDto', CreateCustomerDto],
  ['EditCustomerDto', EditCustomerDto],
])('%s — реквизиты клиента', (_name, metatype) => {
  const pipe = new ValidationPipe();
  const meta = { type: 'body', metatype } as any;

  const parse = (body: Record<string, unknown>) =>
    pipe.transform(
      snakeToCamel({
        customer_type: 'business',
        display_name: 'ООО Ромашка',
        // Без валюты создание отвергается целиком (@IsNotEmpty), и любой
        // тест на реквизиты становится ложно-красным — валюта обязательна.
        currency_code: 'RUB',
        ...body,
      }),
      meta,
    );

  it('верные реквизиты проходят', async () => {
    const result: any = await parse({
      inn: '7707083893',
      kpp: '770701001',
      ogrn: '1027700132195',
      bank_bik: '044525225',
      bank_account: '40702810000000001234',
      bank_correspondent_account: '30101810400000000225',
    });

    expect(result.inn).toBe('7707083893');
    expect(result.bankBik).toBe('044525225');
  });

  it('пустые реквизиты проходят — поля необязательны', async () => {
    const result: any = await parse({
      inn: '',
      kpp: '',
      ogrn: '',
      bank_bik: '',
      bank_account: '',
      bank_correspondent_account: '',
    });

    expect(result.displayName).toBe('ООО Ромашка');
  });

  it('ИНН с непроходящей контрольной суммой отвергается (было и раньше)', async () => {
    await expect(parse({ inn: '1234567890' })).rejects.toThrow();
  });

  it('БИК не с 04 отвергается', async () => {
    await expect(parse({ bank_bik: '994525225' })).rejects.toThrow();
  });

  it('расчётный счёт короче 20 цифр отвергается', async () => {
    await expect(parse({ bank_account: '407028100000' })).rejects.toThrow();
  });

  it('корсчёт не с 30101 отвергается', async () => {
    await expect(
      parse({ bank_correspondent_account: '40702810000000001234' }),
    ).rejects.toThrow();
  });
});
