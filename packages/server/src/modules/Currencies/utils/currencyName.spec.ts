// © 2026 Bigfin
import { currencyName } from './currencyName';

describe('название валюты на языке организации', () => {
  it('русская организация видит рубль по-русски', () => {
    expect(currencyName('RUB', 'ru')).toBe('Российский рубль');
    expect(currencyName('USD', 'ru')).toBe('Доллар США');
    expect(currencyName('CNY', 'ru')).toBe('Китайский юань');
  });

  it('английская организация видит названия библиотеки', () => {
    expect(currencyName('RUB', 'en')).toBe('Russian Ruble');
    expect(currencyName('USD', 'en')).toBe('US Dollar');
  });

  it('без языка ведёт себя как раньше — по-английски', () => {
    expect(currencyName('EUR')).toBe('Euro');
  });

  it('валюта без русского названия остаётся английской, а не пустой', () => {
    // Карта покрывает ходовые валюты; для редких честнее показать
    // английское название, чем выдумать перевод.
    expect(currencyName('BHD', 'ru')).toBe('Bahraini Dinar');
  });

  it('неизвестный код даёт сам код, а не пустоту', () => {
    expect(currencyName('XXX_НЕТ', 'ru')).toBe('XXX_НЕТ');
    expect(currencyName('XXX_НЕТ', 'en')).toBe('XXX_НЕТ');
  });
});
