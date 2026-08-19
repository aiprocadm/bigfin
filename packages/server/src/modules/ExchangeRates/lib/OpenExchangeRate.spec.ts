// © 2026 Bigfin
jest.mock('axios');
import Axios from 'axios';
import { OpenExchangeRate } from './OpenExchangeRate';

/**
 * М3 срез 2 (карта v15): запрос курса шёл во внешнюю службу БЕЗ таймаута —
 * при её недоступности запрос висел бесконечно и держал воркер, а платёжный
 * календарь ходит туда на каждую валютную операцию.
 *
 * Отдельно: отсутствующий курс подменялся единицей — документ в чужой валюте
 * молча считался по курсу 1.
 */
describe('OpenExchangeRate', () => {
  const get = Axios.get as jest.Mock;

  beforeEach(() => {
    get.mockReset();
  });

  const service = () => new OpenExchangeRate('test-key');

  const attempt = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return null;
    } catch (error: any) {
      return error;
    }
  };

  it('в запрос передан таймаут', async () => {
    get.mockResolvedValueOnce({ data: { rates: { RUB: 92.5 } } });
    await service().latest('USD', 'RUB');

    expect(get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    const [, options] = get.mock.calls[0];
    expect(options.timeout).toBeGreaterThan(0);
  });

  it('служба недоступна — деловая ошибка, а не сырая сетевая', async () => {
    get.mockRejectedValueOnce(Object.assign(new Error('timeout of 10000ms')));

    const error = await attempt(() => service().latest('USD', 'RUB'));

    expect(error?.errorType).toBe('EX_RATE_SERVICE_UNAVAILABLE');
  });

  it('превышен лимит запросов — свой код ошибки', async () => {
    get.mockRejectedValueOnce({ response: { status: 429, data: {} } });

    const error = await attempt(() => service().latest('USD', 'RUB'));

    expect(error?.errorType).toBe('EX_RATE_LIMIT_EXCEEDED');
  });

  it('курса нет в ответе — ошибка, а не единица', async () => {
    get.mockResolvedValueOnce({ data: { rates: {} } });

    const error = await attempt(() => service().latest('USD', 'RUB'));

    expect(error?.errorType).toBe('EX_RATE_NOT_FOUND');
  });

  it('без ключа в сеть не ходим вовсе', async () => {
    const error = await attempt(() => new OpenExchangeRate('').latest('USD', 'RUB'));

    expect(error?.errorType).toBe(
      'EX_RATE_SERVICE_API_KEY_REQUIRED',
    );
    expect(get).not.toHaveBeenCalled();
  });
});
