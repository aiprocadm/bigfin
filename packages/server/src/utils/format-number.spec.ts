import { formatNumber } from './format-number';

/** Неразрывный пробел — чтобы сумма не разрывалась при переносе строки. */
const NB = '\u00A0';

/**
 * Приёмка ④: как деньги выглядят в отчётах. Русский формат — «590 000,00 ₽»:
 * неразрывный пробел между разрядами, запятая перед копейками, знак валюты
 * ПОСЛЕ суммы.
 * Библиотека валют отдаёт для рубля `symbol: 'RUB'`, а настоящий знак лежит
 * в `symbol_native` — из-за этого в отчётах было «RUB590,000.00».
 */
describe('рубль', () => {
  it('печатается по-русски: пробел, запятая, знак после суммы', () => {
    expect(formatNumber(590000, { currencyCode: 'RUB' })).toBe(`590${NB}000,00${NB}₽`);
  });

  it('копейки отделяются запятой', () => {
    expect(formatNumber(1234.5, { currencyCode: 'RUB' })).toBe(`1${NB}234,50${NB}₽`);
  });

  it('миллионы разбиваются по разрядам', () => {
    expect(formatNumber(12345678.9, { currencyCode: 'RUB' })).toBe(`12${NB}345${NB}678,90${NB}₽`);
  });

  it('сумма меньше тысячи обходится без разделителя', () => {
    expect(formatNumber(999.99, { currencyCode: 'RUB' })).toBe(`999,99${NB}₽`);
  });

  it('минус ставится перед суммой', () => {
    expect(formatNumber(-1500, { currencyCode: 'RUB' })).toBe(`-1${NB}500,00${NB}₽`);
  });

  it('в скобочном формате минус заменяется скобками', () => {
    expect(
      formatNumber(-1500, { currencyCode: 'RUB', negativeFormat: 'parentheses' }),
    ).toBe(`(1${NB}500,00${NB}₽)`);
  });

  it('без денежного оформления печатается голое число в русском формате', () => {
    expect(formatNumber(590000, { currencyCode: 'RUB', money: false })).toBe(`590${NB}000,00`);
  });

  it('деление на тысячи не ломает формат', () => {
    expect(
      formatNumber(590000, { currencyCode: 'RUB', divideOn1000: true }),
    ).toBe(`590,00${NB}₽`);
  });

  it('ноль можно скрыть настройкой', () => {
    expect(
      formatNumber(0, { currencyCode: 'RUB', excerptZero: true, zeroSign: '—' }),
    ).toBe('—');
  });

  it('явно заданные разделители сильнее правил валюты', () => {
    expect(
      formatNumber(1000, { currencyCode: 'RUB', thousand: '', decimal: '.' }),
    ).toBe(`1000.00${NB}₽`);
  });
});

describe('другие валюты', () => {
  it('доллар печатается по-английски: знак перед суммой', () => {
    expect(formatNumber(1500.5, { currencyCode: 'USD' })).toBe('$1,500.50');
  });

  it('евро печатается своим знаком', () => {
    expect(formatNumber(1000, { currencyCode: 'EUR' })).toBe('€1,000.00');
  });

  it('без указания валюты остаётся голое число', () => {
    expect(formatNumber(1000, {})).toBe('1,000.00');
  });
});
