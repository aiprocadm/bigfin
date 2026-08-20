import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BuildOrganizationDto, UpdateOrganizationDto } from './Organization.dto';
import { ACCEPTED_LOCALES } from '../Organization.constants';
import { ACCEPTED_LOCALES as ACCEPTED_LOCALES_DUPLICATE } from '../Organization/constants';
import { snakeToCamel } from '@/common/interceptors/serialize.interceptor';
import { ValidationPipe } from '@/common/pipes/ClassValidation.pipe';

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

describe('BuildOrganizationDto — режим интерфейса в онбординге (③)', () => {
  it('принимает business и accountant', async () => {
    for (const mode of ['business', 'accountant']) {
      const dto = plainToInstance(BuildOrganizationDto, {
        ...validRussianOrg,
        interfaceMode: mode,
      });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('поле необязательно — без него организация создаётся (режим по умолчанию business)', async () => {
    const dto = plainToInstance(BuildOrganizationDto, validRussianOrg);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('отклоняет неизвестный режим', async () => {
    const dto = plainToInstance(BuildOrganizationDto, {
      ...validRussianOrg,
      interfaceMode: 'superuser',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

/**
 * Р2 срез 1 (карта v16): форма «Настройки → Общие» шлёт ВСЕ свои поля разом,
 * и незаполненные приходят пустой строкой. Текстовые реквизиты это переживали
 * (их проверки считают пустую строку «не заполнено»), а юр. форма, налоговый
 * режим и ОГРН падали — и вместе с ними переставал сохраняться ВЕСЬ экран,
 * включая название организации.
 *
 * Проба повторяет боевую цепочку: тело запроса → перехватчик → разбор.
 */
describe('UpdateOrganizationDto — реквизиты организации', () => {
  const pipe = new ValidationPipe();
  const meta = { type: 'body', metatype: UpdateOrganizationDto } as any;

  const parse = (body: Record<string, unknown>) =>
    pipe.transform(snakeToCamel(body), meta);

  it('пустая форма реквизитов не мешает сохранить остальное', async () => {
    const result: any = await parse({
      name: 'Демо-организация',
      legal_form: '',
      tax_regime: '',
      inn: '',
      kpp: '',
      ogrn: '',
      bank_name: '',
      bank_bik: '',
      bank_account: '',
      bank_correspondent_account: '',
    });

    expect(result.name).toBe('Демо-организация');
    expect(result.legalForm).toBe('');
  });

  it('заполненные реквизиты доходят до сервиса', async () => {
    const result: any = await parse({
      legal_form: 'OOO',
      tax_regime: 'OSNO',
      inn: '7707083893',
      kpp: '770701001',
      ogrn: '1027700132195',
      bank_bik: '044525225',
      bank_account: '40702810000000001234',
      bank_correspondent_account: '30101810400000000225',
    });

    expect(result.legalForm).toBe('OOO');
    expect(result.taxRegime).toBe('OSNO');
    expect(result.inn).toBe('7707083893');
    expect(result.bankBik).toBe('044525225');
  });

  it('выдуманная юр. форма по-прежнему не проходит', async () => {
    await expect(parse({ legal_form: 'ZAO' })).rejects.toThrow();
  });

  it('выдуманный налоговый режим по-прежнему не проходит', async () => {
    await expect(parse({ tax_regime: 'ENVD' })).rejects.toThrow();
  });

  it('неверный ИНН по-прежнему не проходит', async () => {
    await expect(parse({ inn: '1234567890' })).rejects.toThrow();
  });

  it('ОГРН с опечаткой по-прежнему не проходит', async () => {
    await expect(parse({ ogrn: '1027700132196' })).rejects.toThrow();
  });
});
