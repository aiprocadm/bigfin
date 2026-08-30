import { describe, it, expect } from 'vitest';
import { searchScopeLabel } from './searchScope';

/**
 * С3 карты v39. Поиск говорит, среди чего он ищет.
 *
 * В шапке было написано «Поиск по контрагентам, счетам…», и человек читал
 * это как «ищу везде». На деле поиск смотрит ОДИН вид записей за раз — тот,
 * что выбран кнопкой в окне. Отсюда и «Ничего не найдено» на экране счетов
 * при вводе имени клиента: искали среди счетов.
 */
const ВИДЫ = [
  { key: 'customer', label: 'Клиенты' },
  { key: 'invoice', label: 'Счета покупателям' },
];

describe('среди чего ищет поиск', () => {
  it('называет выбранный вид записей', () => {
    expect(searchScopeLabel(ВИДЫ, 'invoice')).toBe('Счета покупателям');
  });

  it('неизвестный вид не превращается в «undefined» на экране', () => {
    expect(searchScopeLabel(ВИДЫ, 'credit')).toBe('');
  });

  it('пустой список видов не роняет экран', () => {
    expect(searchScopeLabel([], 'invoice')).toBe('');
    expect(searchScopeLabel(undefined, 'invoice')).toBe('');
  });

  it('без выбранного вида ничего не выдумывает', () => {
    expect(searchScopeLabel(ВИДЫ, undefined)).toBe('');
  });
});
