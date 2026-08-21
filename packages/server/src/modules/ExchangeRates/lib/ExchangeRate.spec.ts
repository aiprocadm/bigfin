// © 2026 Bigfin
import { ExchangeRate } from './ExchangeRate';
import { ExchangeRateServiceType } from './types';

/**
 * К1 срез 2 (карта v17). Живая проба поймала: дата ТЕРЯЛАСЬ в этой обёртке —
 * делегирующий `latest(base, to)` не принимал третий аргумент, и курс «на
 * 1 августа» молча приходил сегодняшним. Юнит-тесты сервиса это не ловили:
 * они подменяли провайдера в обход обёртки.
 */
describe('ExchangeRate (обёртка-фабрика)', () => {
  it('дата долетает до выбранного поставщика', async () => {
    const wrapper = new ExchangeRate(ExchangeRateServiceType.CbrRu);
    const seen: any[] = [];
    (wrapper as any).exchangeRateService = {
      latest: async (...args: any[]) => {
        seen.push(args);
        return 79.46;
      },
    };

    await wrapper.latest('USD', 'RUB', '2026-08-01');

    expect(seen).toEqual([['USD', 'RUB', '2026-08-01']]);
  });
});
