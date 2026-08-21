// © 2026 Bigfin
jest.mock('axios');
import Axios from 'axios';
import { CbrExchangeRate } from './CbrExchangeRate';

/**
 * К1 срез 1 (карта v17). Единственным источником курса был платный
 * зарубежный OpenExchangeRates с ключом — из РФ ненадёжен. Официальный XML
 * ЦБ РФ бесплатен, без ключа и отдаёт курс за единицу (VunitRate).
 *
 * Формат ответа: windows-1251, `<Valute><CharCode>USD</CharCode>
 * <Nominal>1</Nominal><Value>80,50</Value><VunitRate>80,5</VunitRate>`.
 * Курс ЦБ — «рублей за единицу валюты»; кросс двух не-рублёвых валют
 * считается через рубль.
 */
const CBR_XML = `<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="21.08.2026" name="Foreign Currency Market"><Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>Доллар США</Name><Value>80,5000</Value><VunitRate>80,5</VunitRate></Valute><Valute ID="R01239"><NumCode>978</NumCode><CharCode>EUR</CharCode><Nominal>1</Nominal><Name>Евро</Name><Value>92,0000</Value><VunitRate>92</VunitRate></Valute><Valute ID="R01335"><NumCode>398</NumCode><CharCode>KZT</CharCode><Nominal>100</Nominal><Name>Тенге</Name><Value>16,1000</Value><VunitRate>0,161</VunitRate></Valute></ValCurs>`;

/** Ответ приходит байтами windows-1251 — как в бою (responseType arraybuffer). */
const cbrResponse = (xml: string = CBR_XML) => {
  const bytes: number[] = [];
  for (const ch of xml) {
    const code = ch.codePointAt(0)!;
    // Кириллица win-1251: А-я = 0xC0..0xFF, Ё/ё отдельно; латиница как есть.
    if (code < 128) bytes.push(code);
    else if (code >= 0x410 && code <= 0x44f) bytes.push(code - 0x410 + 0xc0);
    else if (code === 0x401) bytes.push(0xa8);
    else if (code === 0x451) bytes.push(0xb8);
    else bytes.push(0x3f);
  }
  return { data: Buffer.from(bytes) };
};

describe('CbrExchangeRate', () => {
  const get = Axios.get as jest.Mock;

  beforeEach(() => {
    get.mockReset();
  });

  const service = () => new CbrExchangeRate();

  const attempt = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return null;
    } catch (error: any) {
      return error;
    }
  };

  it('доллар к рублю — курс ЦБ как есть', async () => {
    get.mockResolvedValueOnce(cbrResponse());

    await expect(service().latest('USD', 'RUB')).resolves.toBe(80.5);
  });

  it('рубль к доллару — обратный курс', async () => {
    get.mockResolvedValueOnce(cbrResponse());

    await expect(service().latest('RUB', 'USD')).resolves.toBeCloseTo(
      1 / 80.5,
      9,
    );
  });

  it('кросс-курс двух валют считается через рубль', async () => {
    get.mockResolvedValueOnce(cbrResponse());

    // 1 EUR = 92 ₽, 1 USD = 80,5 ₽ → 1 EUR = 92/80,5 USD.
    await expect(service().latest('EUR', 'USD')).resolves.toBeCloseTo(
      92 / 80.5,
      9,
    );
  });

  it('номинал 100 не ломает курс — берётся VunitRate за единицу', async () => {
    get.mockResolvedValueOnce(cbrResponse());

    await expect(service().latest('KZT', 'RUB')).resolves.toBeCloseTo(
      0.161,
      9,
    );
  });

  it('одинаковые валюты — единица без похода в сеть', async () => {
    await expect(service().latest('RUB', 'RUB')).resolves.toBe(1);
    expect(get).not.toHaveBeenCalled();
  });

  it('в запрос передан таймаут', async () => {
    get.mockResolvedValueOnce(cbrResponse());
    await service().latest('USD', 'RUB');

    const [, options] = get.mock.calls[0];
    expect(options.timeout).toBeGreaterThan(0);
  });

  it('валюты нет в списке ЦБ — честная ошибка, а не единица', async () => {
    get.mockResolvedValueOnce(cbrResponse());

    const error = await attempt(() => service().latest('XXX', 'RUB'));

    expect(error?.errorType).toBe('EX_RATE_NOT_FOUND');
  });

  it('служба недоступна — деловая ошибка, а не сырая сетевая', async () => {
    get.mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));

    const error = await attempt(() => service().latest('USD', 'RUB'));

    expect(error?.errorType).toBe('EX_RATE_SERVICE_UNAVAILABLE');
  });

  it('битый ответ (не XML ЦБ) — тоже деловая ошибка', async () => {
    get.mockResolvedValueOnce({ data: Buffer.from('<html>болванка</html>') });

    const error = await attempt(() => service().latest('USD', 'RUB'));

    expect(error?.errorType).toBe('EX_RATE_NOT_FOUND');
  });
});
