import { describe, expect, it } from 'vitest';

import {
  COMPARE_STORAGE_KEY,
  compareQueryParams,
  formatBaseRange,
  formatChangePercent,
  hasComparisonBase,
  readStoredCompare,
  storeCompare,
} from './dashboardCompare';

/**
 * Сравнение периодов на главной (FT-061 ТЗ-3).
 *
 * Главное правило: при нулевой базе процента нет НИГДЕ. Сервер присылает
 * `null`, и витрина обязана показать слова, а не «+100 %» или «0 %».
 */
describe('нет базы — нет процента', () => {
  it('null и undefined — базы нет', () => {
    expect(hasComparisonBase(null)).toBe(false);
    expect(hasComparisonBase(undefined)).toBe(false);
    expect(formatChangePercent(null)).toBeNull();
    expect(formatChangePercent(undefined)).toBeNull();
  });

  it('бесконечность и «не число» — тоже не процент', () => {
    // Деление на ноль, случись оно где-то по дороге, не должно
    // превратиться в «+Infinity%» на экране.
    expect(formatChangePercent(Infinity)).toBeNull();
    expect(formatChangePercent(Number.NaN)).toBeNull();
  });

  it('ноль при настоящей базе — это процент, а не «нет базы»', () => {
    // Показатель не изменился — это ответ, а не отсутствие сравнения.
    expect(hasComparisonBase(0)).toBe(true);
    expect(formatChangePercent(0)).toBe('+0%');
  });

  it('рост и падение печатаются со знаком', () => {
    expect(formatChangePercent(12.5)).toBe('+12.5%');
    expect(formatChangePercent(-3)).toBe('-3%');
  });
});

describe('параметры запроса', () => {
  it('готовые варианты уходят как есть', () => {
    expect(compareQueryParams({ kind: 'previous' })).toEqual({ compare: 'previous' });
    expect(compareQueryParams({ kind: 'previous2' })).toEqual({ compare: 'previous2' });
    expect(compareQueryParams({ kind: 'last_year' })).toEqual({ compare: 'last_year' });
  });

  it('свой отрезок уходит с датами', () => {
    expect(
      compareQueryParams({ kind: 'custom', fromDate: '2026-01-01', toDate: '2026-01-31' }),
    ).toEqual({ compare: 'custom', compareFrom: '2026-01-01', compareTo: '2026-01-31' });
  });

  it('недозаполненный или перевёрнутый отрезок — это прошлый период', () => {
    // Иначе главная спрашивала бы сервер про отрезок без конца на каждую
    // первую введённую дату.
    expect(compareQueryParams({ kind: 'custom', fromDate: '2026-01-01' })).toEqual({
      compare: 'previous',
    });
    expect(
      compareQueryParams({ kind: 'custom', fromDate: '2026-02-01', toDate: '2026-01-01' }),
    ).toEqual({ compare: 'previous' });
  });
});

describe('хранение выбора', () => {
  const memory = () => {
    const data: Record<string, string> = {};
    return {
      getItem: (key: string) => data[key] ?? null,
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
    };
  };

  it('выбор переживает перезагрузку', () => {
    const storage = memory();
    storeCompare(storage, { kind: 'last_year' });
    expect(readStoredCompare(storage)).toEqual({ kind: 'last_year' });

    storeCompare(storage, { kind: 'custom', fromDate: '2026-01-01', toDate: '2026-01-31' });
    expect(readStoredCompare(storage)).toEqual({
      kind: 'custom',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
    });
  });

  it('мусор в хранилище — база по умолчанию, а не падение', () => {
    const storage = memory();
    storage.setItem(COMPARE_STORAGE_KEY, '{oops');
    expect(readStoredCompare(storage)).toEqual({ kind: 'previous' });
    storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify({ kind: 'decade' }));
    expect(readStoredCompare(storage)).toEqual({ kind: 'previous' });
    expect(readStoredCompare(undefined)).toEqual({ kind: 'previous' });
  });
});

describe('подпись базы', () => {
  it('база в том же году — без года', () => {
    expect(formatBaseRange('2026-08-01', '2026-08-31', 2026)).toBe('01.08–31.08');
  });

  it('база в другом году — с годом, иначе не отличить от текущего периода', () => {
    expect(formatBaseRange('2025-09-01', '2025-09-30', 2026)).toBe(
      '01.09.2025–30.09.2025',
    );
  });

  it('база в один день — одна дата', () => {
    expect(formatBaseRange('2026-08-01', '2026-08-01', 2026)).toBe('01.08');
  });
});
