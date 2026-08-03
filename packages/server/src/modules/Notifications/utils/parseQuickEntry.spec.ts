import { parseQuickEntry } from './parseQuickEntry';

describe('parseQuickEntry', () => {
  it('число без знака — расход (так вводят чаще)', () => {
    expect(parseQuickEntry('1500 такси')).toEqual({
      kind: 'entry',
      amount: -1500,
      description: 'такси',
    });
  });

  it('минус — расход, плюс — приход', () => {
    expect(parseQuickEntry('-1500 такси')).toMatchObject({ amount: -1500 });
    expect(parseQuickEntry('+50000 оплата от клиента')).toEqual({
      kind: 'entry',
      amount: 50000,
      description: 'оплата от клиента',
    });
  });

  it('понимает пробелы-разделители и запятую', () => {
    expect(parseQuickEntry('1 500,50 обед')).toMatchObject({ amount: -1500.5 });
    expect(parseQuickEntry('−2 000 аренда')).toMatchObject({ amount: -2000 });
  });

  it('сумма без описания допустима', () => {
    expect(parseQuickEntry('-1500')).toEqual({
      kind: 'entry',
      amount: -1500,
      description: null,
    });
  });

  it('команда /help — подсказка, /start — приветствие', () => {
    expect(parseQuickEntry('/help')).toEqual({ kind: 'help' });
    expect(parseQuickEntry('/start')).toEqual({ kind: 'start' });
  });

  it('строка без числа операцией не считается', () => {
    expect(parseQuickEntry('привет')).toEqual({ kind: 'unknown' });
    expect(parseQuickEntry('')).toEqual({ kind: 'unknown' });
  });

  it('нулевая сумма не операция', () => {
    expect(parseQuickEntry('0 ничего')).toEqual({ kind: 'unknown' });
  });

  it('описание чистится от лишних пробелов', () => {
    expect(parseQuickEntry('  -300   кофе   с   молоком ')).toMatchObject({
      description: 'кофе с молоком',
    });
  });

  it('валюта в тексте не ломает разбор', () => {
    expect(parseQuickEntry('-1500 ₽ такси')).toMatchObject({
      amount: -1500,
      description: '₽ такси',
    });
  });
});
