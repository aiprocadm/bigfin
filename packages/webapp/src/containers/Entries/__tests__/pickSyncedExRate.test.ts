import { describe, it, expect } from 'vitest';
import { pickSyncedExRate } from '../pickSyncedExRate';

/**
 * М3 срез 2 (карта v15): молчаливый курс 1 при недоступной службе — это
 * счёт в долларах, посчитанный по рублю. Такого больше быть не должно.
 */
describe('pickSyncedExRate', () => {
  it('нормальный курс проходит как есть', () => {
    expect(pickSyncedExRate(92.5)).toBe(92.5);
  });

  it('строку с числом тоже понимает', () => {
    expect(pickSyncedExRate('92.5')).toBe(92.5);
  });

  it('курса нет — возвращаем «не знаем», а не единицу', () => {
    expect(pickSyncedExRate(undefined)).toBeNull();
    expect(pickSyncedExRate(null)).toBeNull();
  });

  it('ноль и отрицательный курс — тоже «не знаем»', () => {
    expect(pickSyncedExRate(0)).toBeNull();
    expect(pickSyncedExRate(-5)).toBeNull();
  });

  it('мусор вместо числа не превращается в единицу', () => {
    expect(pickSyncedExRate('нет данных')).toBeNull();
  });
});
