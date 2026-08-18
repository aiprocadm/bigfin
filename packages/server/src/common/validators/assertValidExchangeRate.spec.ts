import { assertValidExchangeRate } from './assertValidExchangeRate';

/**
 * С4 (карта v14): документ в чужой валюте обязан нести настоящий курс.
 * Раньше «|| 1» молча проводил расход в EUR по курсу 1 — прямое искажение
 * журнала и отчётов.
 */
describe('assertValidExchangeRate', () => {
  const attempt = (args: any) => {
    try {
      assertValidExchangeRate(args);
      return null;
    } catch (error: any) {
      return error;
    }
  };

  it('чужая валюта без курса — деловая ошибка с кодом', () => {
    const error = attempt({
      currencyCode: 'EUR',
      baseCurrency: 'RUB',
      exchangeRate: undefined,
    });
    expect(error?.errorType).toBe('EXCHANGE_RATE_REQUIRED');
  });

  it('чужая валюта с нулевым курсом — деловая ошибка', () => {
    const error = attempt({
      currencyCode: 'EUR',
      baseCurrency: 'RUB',
      exchangeRate: 0,
    });
    expect(error?.errorType).toBe('EXCHANGE_RATE_REQUIRED');
  });

  it('чужая валюта с настоящим курсом проходит', () => {
    expect(
      attempt({ currencyCode: 'EUR', baseCurrency: 'RUB', exchangeRate: 92.5 }),
    ).toBeNull();
  });

  it('базовая валюта без курса проходит (как раньше)', () => {
    expect(
      attempt({
        currencyCode: 'RUB',
        baseCurrency: 'RUB',
        exchangeRate: undefined,
      }),
    ).toBeNull();
  });

  it('неизвестная валюта или база — не мешаем (как раньше)', () => {
    expect(
      attempt({
        currencyCode: undefined,
        baseCurrency: 'RUB',
        exchangeRate: undefined,
      }),
    ).toBeNull();
    expect(
      attempt({
        currencyCode: 'EUR',
        baseCurrency: undefined,
        exchangeRate: undefined,
      }),
    ).toBeNull();
  });
});
