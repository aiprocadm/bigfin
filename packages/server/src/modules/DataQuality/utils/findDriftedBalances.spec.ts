// © 2026 Bigfin
import {
  DRIFT_TOLERANCE,
  findDriftedBalances,
} from './findDriftedBalances';

/**
 * Остаток счёта разошёлся с проводками.
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ ПО СТЕНДУ: шапка показывала 1 749 839,09 ₽, а
 * отчёт о движении денег — 1 748 838,59 ₽. Разница 1 000,50 ₽ по одной
 * кассе. Требование §15.1 ТЗ-2 нарушалось, и заметить это можно было
 * только сравнив два экрана глазами.
 */
const account = (
  id: number,
  storedAmount: number | null,
  ledgerAmount: number,
) => ({
  id,
  name: `Счёт ${id}`,
  accountType: 'bank',
  storedAmount,
  ledgerAmount,
});

describe('расхождение остатка счёта с проводками', () => {
  it('СОВПАДАЮЩИЕ ОСТАТКИ НЕ ПОПАДАЮТ В ОТЧЁТ', () => {
    // Иначе отчёт превращается в список всех счетов, и его перестают
    // открывать.
    const result = findDriftedBalances([account(1, 120_000, 120_000)]);

    expect(result.rows).toEqual([]);
    expect(result.totalDifference).toBe(0);
  });

  it('находит тот самый случай со стенда', () => {
    const result = findDriftedBalances([account(1003, 121_000.5, 120_000)]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].difference).toBe(1000.5);
    expect(result.totalDifference).toBe(1000.5);
  });

  it('колонка МЕНЬШЕ проводок — тоже расхождение', () => {
    // Оно опаснее: человек думает, что денег меньше, чем на самом деле, и
    // не платит по счетам, которые мог бы оплатить.
    const result = findDriftedBalances([account(1, 90_000, 100_000)]);

    expect(result.rows[0].difference).toBe(-10_000);
  });

  it('незаполненная колонка — НЕ расхождение', () => {
    // У счёта без движения она остаётся пустой; объявлять это ошибкой
    // значит завалить отчёт шумом.
    const result = findDriftedBalances([account(1, null, 0)]);

    expect(result.rows).toEqual([]);
  });

  it('погрешность округления не считается расхождением', () => {
    // Полкопейки — обычная погрешность пересчёта валют. Пищать из-за неё
    // значит приучить человека не смотреть на этот отчёт.
    const result = findDriftedBalances([
      account(1, 100_000 + DRIFT_TOLERANCE / 2, 100_000),
    ]);

    expect(result.rows).toEqual([]);
  });

  it('крупные расхождения идут первыми', () => {
    const result = findDriftedBalances([
      account(1, 100_500, 100_000),
      account(2, 50_000, 90_000),
      account(3, 10_100, 10_000),
    ]);

    expect(result.rows.map((row) => row.id)).toEqual([2, 1, 3]);
  });

  it('итог показывает, НА СКОЛЬКО ВРЁТ общий остаток', () => {
    // Ради этого числа отчёт и нужен: оно объясняет разницу между шапкой
    // и отчётом одной цифрой.
    const result = findDriftedBalances([
      account(1, 100_500, 100_000),
      account(2, 90_000, 100_000),
    ]);

    expect(result.totalDifference).toBe(-9_500);
  });

  it('пустой список не роняет расчёт', () => {
    expect(findDriftedBalances()).toEqual({ rows: [], totalDifference: 0 });
    expect(findDriftedBalances([])).toEqual({ rows: [], totalDifference: 0 });
  });
});
