// © 2026 Bigfin
import { FallbackExchangeRate } from './FallbackExchangeRate';

/**
 * К1 срез 1 (карта v17). Основной источник курса — ЦБ РФ; прежний платный
 * OpenExchangeRates остаётся запасным и зовётся только при отказе основного
 * И только если задан его ключ. Несвежий кэш при полном отказе отдаёт слой
 * выше (ExchangeRatesService) — здесь его нет.
 */
const stub = (behavior: () => Promise<number>) => {
  const calls: string[][] = [];
  return {
    calls,
    latest: (base: string, to: string) => {
      calls.push([base, to]);
      return behavior();
    },
  };
};

describe('FallbackExchangeRate', () => {
  it('основной ответил — запасной не зовётся вовсе', async () => {
    const primary = stub(async () => 80.5);
    const backup = stub(async () => 999);
    const service = new FallbackExchangeRate(primary, backup, true);

    await expect(service.latest('USD', 'RUB')).resolves.toBe(80.5);
    expect(backup.calls).toHaveLength(0);
  });

  it('основной упал — курс приходит от запасного', async () => {
    const primary = stub(async () => {
      throw new Error('ЦБ недоступен');
    });
    const backup = stub(async () => 81);
    const service = new FallbackExchangeRate(primary, backup, true);

    await expect(service.latest('USD', 'RUB')).resolves.toBe(81);
    expect(primary.calls).toHaveLength(1);
    expect(backup.calls).toEqual([['USD', 'RUB']]);
  });

  it('запасной не настроен (нет ключа) — ошибка основного, запасной не зовётся', async () => {
    const primaryError = new Error('ЦБ недоступен');
    const primary = stub(async () => {
      throw primaryError;
    });
    const backup = stub(async () => 81);
    const service = new FallbackExchangeRate(primary, backup, false);

    await expect(service.latest('USD', 'RUB')).rejects.toBe(primaryError);
    expect(backup.calls).toHaveLength(0);
  });

  it('дата прокидывается основному и запасному', async () => {
    const seen: any[] = [];
    const primary = {
      latest: async (...args: any[]) => {
        seen.push(['primary', ...args]);
        throw new Error('упал');
      },
    };
    const backup = {
      latest: async (...args: any[]) => {
        seen.push(['backup', ...args]);
        return 81;
      },
    };
    const service = new FallbackExchangeRate(primary, backup, true);

    await service.latest('USD', 'RUB', '2026-08-01');

    expect(seen).toEqual([
      ['primary', 'USD', 'RUB', '2026-08-01'],
      ['backup', 'USD', 'RUB', '2026-08-01'],
    ]);
  });

  it('упали оба — наружу уходит ошибка основного (она говорит про ЦБ)', async () => {
    const primaryError = new Error('ЦБ недоступен');
    const primary = stub(async () => {
      throw primaryError;
    });
    const backup = stub(async () => {
      throw new Error('нет ключа OpenExchangeRates');
    });
    const service = new FallbackExchangeRate(primary, backup, true);

    await expect(service.latest('USD', 'RUB')).rejects.toBe(primaryError);
  });
});
