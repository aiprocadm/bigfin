import { describe, expect, it, vi } from 'vitest';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) =>
      ({
        'compact.thousand': 'тыс.',
        'compact.million': 'млн',
        'compact.billion': 'млрд',
      }[key] ?? key),
  },
}));

import { formattedCompactAmount } from './compactMoney';

const NBSP = ' ';
const s = (text: string) => text.replace(/ /g, NBSP);

/**
 * UI-042-1 и R16 ТЗ-4. Короткая сумма там, где полная не влезает: в шапке на
 * телефоне «1 749 839,09 ₽» обрезалась до «749 839,09 ₽» — неверное число на
 * глазах у человека. Короткая запись честная: «1,75 млн ₽».
 */
describe('короткая запись суммы', () => {
  it.each([
    [1749839.09, '1,75 млн ₽'],
    [1500000, '1,5 млн ₽'],
    [2000000, '2 млн ₽'],
    [250000, '250 тыс. ₽'],
    [12345, '12,3 тыс. ₽'],
    [3400000000, '3,4 млрд ₽'],
    [999, '999 ₽'],
    [0, '0 ₽'],
  ])('%s → %s', (value, expected) => {
    expect(formattedCompactAmount(value, 'RUB')).toBe(s(expected));
  });

  it('минус сохраняется', () => {
    expect(formattedCompactAmount(-1200000, 'RUB')).toBe(s('-1,2 млн ₽'));
  });

  it('округление не даёт «1000 тыс.» — переходит на следующую ступень', () => {
    expect(formattedCompactAmount(999999, 'RUB')).toBe(s('1 млн ₽'));
  });
});
