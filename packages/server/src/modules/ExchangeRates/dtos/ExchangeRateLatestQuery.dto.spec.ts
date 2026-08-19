// © 2026 Bigfin
import { snakeToCamel } from '@/common/interceptors/serialize.interceptor';
import { ValidationPipe } from '@/common/pipes/ClassValidation.pipe';
import { ExchangeRateLatestQueryDto } from './ExchangeRateLatestQuery.dto';

/**
 * М3 срез 2 (карта v15): живая проба показала, что валюты из строки запроса
 * до контроллера НЕ доходили — приходил пустой объект, и курс всегда считался
 * «базовая к базовой».
 *
 * Причина: в Bigfin глобальный перехватчик переименовывает входящие параметры
 * из `from_currency` в `fromCurrency`, а описание запроса ждало snake_case —
 * поля не совпадали, и проверка выбрасывала их как посторонние.
 *
 * Тест повторяет боевую цепочку: адрес → перехватчик → разбор.
 */
describe('ExchangeRateLatestQueryDto', () => {
  const pipe = new ValidationPipe();
  const meta = { type: 'query', metatype: ExchangeRateLatestQueryDto } as any;

  /** Как приходит из адреса и что с этим делает перехватчик. */
  const parse = (fromUrl: Record<string, string>) =>
    pipe.transform(snakeToCamel(fromUrl), meta);

  it('валюты из адреса доходят до контроллера', async () => {
    const result: any = await parse({
      from_currency: 'USD',
      to_currency: 'EUR',
    });

    expect(result.fromCurrency).toBe('USD');
    expect(result.toCurrency).toBe('EUR');
  });

  it('пустой запрос остаётся пустым и не падает', async () => {
    const result: any = await parse({});

    expect(result.fromCurrency).toBeUndefined();
  });

  it('код валюты не той длины отвергается понятной ошибкой', async () => {
    await expect(parse({ from_currency: 'US' })).rejects.toThrow();
  });
});
