// © 2026 Bigfin
import { ExchangeRatesService } from './ExchangeRates.service';

/**
 * М3 срез 2 (карта v15): служба курсов ходила во внешний сервис на КАЖДЫЙ
 * вызов. Платёжный календарь зовёт её на каждый счёт и каждую плановую
 * операцию — десятки последовательных запросов на одно открытие экрана.
 *
 * И второе: если служба недоступна, экран падал целиком. Последний известный
 * курс лучше отказа — при условии, что он честно помечен несвежим.
 */
describe('ExchangeRatesService', () => {
  const build = (rates: number[] | (() => number)) => {
    const calls = { count: 0 };
    const provider = jest.fn(async () => {
      const value =
        typeof rates === 'function' ? rates() : rates[calls.count] ?? rates[0];
      calls.count += 1;
      if (typeof value !== 'number') throw value;
      return value;
    });
    const service = new ExchangeRatesService();
    // Провайдер подменяется через защищённую точку — иначе тест полез бы в сеть.
    (service as any).createProvider = () => ({ latest: provider });
    (service as any).getBaseCurrency = async () => 'RUB';
    return { service, provider };
  };

  const dto = { fromCurrency: 'USD', toCurrency: 'RUB' } as any;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('повторный запрос той же пары берётся из кэша', async () => {
    const { service, provider } = build([92.5]);

    const first = await service.latest(1, dto);
    const second = await service.latest(1, dto);

    expect(first.exchangeRate).toBe(92.5);
    expect(second.exchangeRate).toBe(92.5);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('кэш не смешивает организации', async () => {
    const { service, provider } = build([92.5, 80]);

    const a = await service.latest(1, dto);
    const b = await service.latest(2, dto);

    expect(a.exchangeRate).toBe(92.5);
    expect(b.exchangeRate).toBe(80);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('после истечения срока кэша спрашиваем заново', async () => {
    const { service, provider } = build([92.5, 95]);
    const now = jest.spyOn(Date, 'now');

    now.mockReturnValue(1_000_000);
    await service.latest(1, dto);
    now.mockReturnValue(1_000_000 + 6 * 60 * 60 * 1000);
    const fresh = await service.latest(1, dto);

    expect(provider).toHaveBeenCalledTimes(2);
    expect(fresh.exchangeRate).toBe(95);
  });

  it('служба недоступна — отдаём последний известный курс с пометкой', async () => {
    const failure = Object.assign(new Error('нет связи'), {
      errorType: 'EX_RATE_SERVICE_UNAVAILABLE',
    });
    const { service } = build([92.5, failure as any]);
    const now = jest.spyOn(Date, 'now');

    now.mockReturnValue(1_000_000);
    await service.latest(1, dto);
    now.mockReturnValue(1_000_000 + 6 * 60 * 60 * 1000);
    const stale = await service.latest(1, dto);

    expect(stale.exchangeRate).toBe(92.5);
    expect(stale.isStale).toBe(true);
  });

  it('обе валюты названы — в базу за валютой организации не ходим', async () => {
    const { service } = build([92.5]);
    const base = jest.fn(async () => 'RUB');
    (service as any).getBaseCurrency = base;

    await service.latest(1, dto);

    // Платёжный календарь зовёт службу в цикле: лишний запрос к базе на
    // каждую операцию — это десятки запросов на одно открытие экрана.
    expect(base).not.toHaveBeenCalled();
  });

  it('валюта не названа — базовую валюту всё-таки спрашиваем', async () => {
    const { service } = build([92.5]);
    const base = jest.fn(async () => 'RUB');
    (service as any).getBaseCurrency = base;

    const result = await service.latest(1, { fromCurrency: 'USD' } as any);

    expect(base).toHaveBeenCalledTimes(1);
    expect(result.toCurrency).toBe('RUB');
  });

  it('кэш не растёт бесконечно', async () => {
    // Валюты приходят из запроса пользователя: без потолка кто угодно
    // раздувал бы память сервера, посылая выдуманные коды валют.
    const { service } = build(() => 1);

    for (let i = 0; i < 1200; i += 1) {
      await service.latest(1, {
        fromCurrency: `X${i}`,
        toCurrency: 'RUB',
      } as any);
    }
    expect((service as any).cache.size).toBeLessThanOrEqual(1000);
  });

  it('служба недоступна и известного курса нет — честная ошибка', async () => {
    const failure = Object.assign(new Error('нет связи'), {
      errorType: 'EX_RATE_SERVICE_UNAVAILABLE',
    });
    const { service } = build([failure as any]);

    await expect(service.latest(1, dto)).rejects.toMatchObject({
      errorType: 'EX_RATE_SERVICE_UNAVAILABLE',
    });
  });
});
