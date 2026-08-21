// © 2026 Bigfin
import { ExchangeRatesController } from './ExchangeRates.controller';

/**
 * М3 срез 2 (карта v15): живая проба на стенде показала, что запрос курса
 * валют ВСЕГДА отвечает 500. Причина — контроллер брал организацию из
 * `req.tenantId`, а это поле в Bigfin никто не заполняет: остальные
 * контроллеры берут организацию из контекста запроса (`TenancyContext`).
 *
 * Тест воспроизводит боевые условия: в запросе поля `tenantId` НЕТ.
 */
describe('ExchangeRatesController', () => {
  const build = (metadata: any = { tenantId: 7, baseCurrency: 'RUB' }) => {
    const latest = jest.fn(async () => ({
      baseCurrency: 'USD',
      toCurrency: 'RUB',
      exchangeRate: 92.5,
    }));
    const tenancyContext = { getTenantMetadata: jest.fn(async () => metadata) };
    const controller = new ExchangeRatesController(
      { latest } as any,
      tenancyContext as any,
    );
    return { controller, latest, tenancyContext };
  };

  // Боевой запрос: express-объект без поля tenantId.
  const request = {} as any;

  it('организация берётся из контекста запроса, а не из req.tenantId', async () => {
    const { controller, latest } = build();

    await controller.getLatestExchangeRate({} as any, request);

    expect(latest).toHaveBeenCalledWith(7, expect.anything());
  });

  it('валюты из строки запроса доходят до службы', async () => {
    const { controller, latest } = build();

    await controller.getLatestExchangeRate(
      { fromCurrency: 'USD', toCurrency: 'EUR' } as any,
      request,
    );

    expect(latest).toHaveBeenCalledWith(7, {
      fromCurrency: 'USD',
      toCurrency: 'EUR',
    });
  });

  it('дата из строки запроса доходит до службы (К1 срез 2 карты v17)', async () => {
    // Живая проба поймала: контроллер собирал объект руками и ТЕРЯЛ дату —
    // курс «на 1 августа» молча приходил сегодняшним.
    const { controller, latest } = build();

    await controller.getLatestExchangeRate(
      { fromCurrency: 'USD', toCurrency: 'RUB', date: '2026-08-01' } as any,
      request,
    );

    expect(latest).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ date: '2026-08-01' }),
    );
  });

  it('ответ службы возвращается как есть', async () => {
    const { controller } = build();

    const result = await controller.getLatestExchangeRate({} as any, request);

    expect(result.exchangeRate).toBe(92.5);
  });
});
