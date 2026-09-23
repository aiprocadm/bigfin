// © 2026 Bigfin
import { splitByShares, validateShares } from './splitShares';

describe('разбиение по долям (FT-031)', () => {
  it('приёмка ТЗ: 100 000 ₽ и 70/30 — две части 70 000 и 30 000', () => {
    expect(splitByShares(100000, [70, 30])).toEqual([70000, 30000]);
  });

  it('копеечный остаток — первой строке', () => {
    // 100 ₽ на три равные части: 33,34 + 33,33 + 33,33.
    expect(splitByShares(100, [33.3333, 33.3333, 33.3334])).toEqual([33.34, 33.33, 33.33]);
  });

  it('сумма частей строго равна родителю на тысяче случайных наборов', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 1000; i += 1) {
      const amount = Math.round(random() * 1_000_000_00) / 100;
      const count = 2 + Math.floor(random() * 5);
      // Доли с двумя знаками, последняя добирает до 100.
      const shares: number[] = [];
      let left = 10000;
      for (let k = 0; k < count - 1; k += 1) {
        const share = 1 + Math.floor(random() * (left - (count - k)));
        shares.push(share);
        left -= share;
      }
      shares.push(left);
      const percents = shares.map((s) => s / 100);
      expect(validateShares(percents).isValid).toBe(true);

      const parts = splitByShares(amount, percents);
      const sumCents = parts.reduce((s, p) => s + Math.round(p * 100), 0);
      expect(sumCents).toBe(Math.round(amount * 100));
      // У каждой части не больше двух знаков после запятой.
      parts.forEach((part) => expect(Math.abs(part * 100 - Math.round(part * 100))).toBeLessThan(1e-6));
    }
  });

  it('проверка долей: пусто, ноль, не 100 %', () => {
    expect(validateShares([]).problem).toBe('empty');
    expect(validateShares([100, 0]).problem).toBe('non_positive_share');
    expect(validateShares([70, 20]).problem).toBe('not_hundred');
    expect(validateShares([33.3333, 33.3333, 33.3334]).isValid).toBe(true);
  });
});
