import { describe, it, expect } from 'vitest';

import {
  PERIOD_STORAGE_KEY,
  defaultPeriod,
  periodRange,
  readStoredPeriod,
  storePeriod,
} from './dashboardPeriod';

/**
 * Этап 2 ТЗ, п. 2.2. Переключатель периода на главной.
 *
 * ТЗ требует: период по умолчанию — текущий месяц, выбор запоминается между
 * сессиями. Тонкость, которую легко упустить: запоминать надо ВИД периода,
 * а не его даты. Иначе в следующем месяце человек откроет главную и увидит
 * прошлый месяц, приняв его за текущий.
 */
const fakeStorage = (initial?: string) => {
  let value = initial;
  return {
    getItem: () => value ?? null,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    read: () => value,
  };
};

describe('период главной страницы', () => {
  it('по умолчанию — текущий месяц', () => {
    expect(defaultPeriod('2026-03-17')).toEqual({
      kind: 'month',
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    });
  });

  it('считает границы месяца, квартала и года', () => {
    expect(periodRange('quarter', '2026-05-10')).toEqual({
      fromDate: '2026-04-01',
      toDate: '2026-06-30',
    });
    expect(periodRange('year', '2026-05-10')).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    });
  });

  it('запоминает вид периода, а не даты', () => {
    const storage = fakeStorage();

    storePeriod(storage, {
      kind: 'month',
      fromDate: '2026-02-01',
      toDate: '2026-02-28',
    });

    // Вернулись в марте: вид прежний, а даты пересчитаны на текущий месяц.
    expect(readStoredPeriod(storage, '2026-03-17')).toEqual({
      kind: 'month',
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    });
  });

  it('произвольный отрезок хранится датами', () => {
    const storage = fakeStorage();
    const custom = {
      kind: 'custom' as const,
      fromDate: '2026-01-15',
      toDate: '2026-02-10',
    };

    storePeriod(storage, custom);

    expect(readStoredPeriod(storage, '2026-03-17')).toEqual(custom);
  });

  it('мусор в хранилище не ломает главную', () => {
    // Чужая вкладка, ручная правка, старая версия — что угодно.
    expect(readStoredPeriod(fakeStorage('не json'), '2026-03-17')).toEqual(
      defaultPeriod('2026-03-17'),
    );
    expect(
      readStoredPeriod(fakeStorage('{"kind":"десятилетие"}'), '2026-03-17'),
    ).toEqual(defaultPeriod('2026-03-17'));
  });

  it('недоступное хранилище не ломает главную', () => {
    // Приватный режим браузера: обращение к хранилищу бросает исключение.
    const broken = {
      getItem: () => {
        throw new Error('доступ запрещён');
      },
      setItem: () => {
        throw new Error('доступ запрещён');
      },
    };

    expect(readStoredPeriod(broken, '2026-03-17')).toEqual(
      defaultPeriod('2026-03-17'),
    );
    expect(() => storePeriod(broken, defaultPeriod('2026-03-17'))).not.toThrow();
  });

  it('хранит выбор под своим ключом', () => {
    const storage = fakeStorage();
    storePeriod(storage, defaultPeriod('2026-03-17'));

    expect(PERIOD_STORAGE_KEY).toBe('bigfin.dashboard.period');
    expect(JSON.parse(storage.read() as string).kind).toBe('month');
  });
});
