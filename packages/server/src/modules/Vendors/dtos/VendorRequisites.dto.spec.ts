// © 2026 Bigfin
import { snakeToCamel } from '@/common/interceptors/serialize.interceptor';
import { ValidationPipe } from '@/common/pipes/ClassValidation.pipe';
import { CreateVendorDto } from './CreateVendor.dto';
import { EditVendorDto } from './EditVendor.dto';

/**
 * Р2 срез 3 (карта v16). У клиента ИНН/КПП/ОГРН проверяются контрольной
 * суммой, а у поставщика — НЕТ: стояли только `@IsString()` и `@MaxLength`.
 * Опечатка в ИНН поставщика уезжала в его карточку и документы молча.
 *
 * Проба повторяет боевую цепочку: тело запроса → перехватчик → разбор.
 */
describe.each([
  ['CreateVendorDto', CreateVendorDto],
  ['EditVendorDto', EditVendorDto],
])('%s — реквизиты поставщика', (_name, metatype) => {
  const pipe = new ValidationPipe();
  const meta = { type: 'body', metatype } as any;

  const parse = (body: Record<string, unknown>) =>
    pipe.transform(snakeToCamel({ display_name: 'ООО Ромашка', ...body }), meta);

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

  it('ИНН с непроходящей контрольной суммой отвергается', async () => {
    await expect(parse({ inn: '1234567890' })).rejects.toThrow();
  });

  it('КПП неверного формата отвергается', async () => {
    await expect(parse({ kpp: 'ABC123' })).rejects.toThrow();
  });

  it('ОГРН с опечаткой отвергается', async () => {
    await expect(parse({ ogrn: '1027700132196' })).rejects.toThrow();
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
