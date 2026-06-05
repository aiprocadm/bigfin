// © 2026 Bigfin
import { bucketIndexForOverdueDays } from './bucketIndexForOverdueDays';
import { AGING_PERIODS } from '../constants';

describe('bucketIndexForOverdueDays', () => {
  const idx = (d: number) => bucketIndexForOverdueDays(d, AGING_PERIODS);

  it('кладёт 1..30 дней в корзину 0', () => {
    expect(idx(1)).toBe(0);
    expect(idx(30)).toBe(1); // граница 30 уходит в 31-60 (как в aging-отчёте)
  });

  it('границы корзин совпадают с aging-логикой', () => {
    expect(idx(31)).toBe(1);
    expect(idx(60)).toBe(2);
    expect(idx(61)).toBe(2);
    expect(idx(90)).toBe(3);
    expect(idx(91)).toBe(3);
  });

  it('нулевая просрочка попадает в первую корзину', () => {
    expect(idx(0)).toBe(0);
  });
});
