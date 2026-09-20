// © 2026 Bigfin
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { daysOfPeriod } from '../PeriodRow';

/**
 * Клетка календаря крупнее дня раскрывается до операций (FIN-019, FIN-020).
 *
 * НАЙДЕНО СВЕРКОЙ ЗАДЕЛА, А НЕ ТЕСТАМИ. Переключатель масштаба на экране
 * был, сервер честно считал периоды — а витрина рисовала дни и периоды не
 * читала ВОВСЕ. Человек менял масштаб, и ничего не происходило.
 *
 * Это самый обидный вид поломки: и код есть, и кнопка есть, и тесты зелёные.
 * Поэтому здесь проверяется не только разбор дней, но и САМ ФАКТ того, что
 * экран читает периоды.
 */
const DAYS = [
  { date: '2026-09-01', inflow: 0, outflow: 0, balance: 0, lines: [] },
  { date: '2026-09-15', inflow: 100, outflow: 0, balance: 100, lines: [] },
  { date: '2026-09-30', inflow: 0, outflow: 50, balance: 50, lines: [] },
  { date: '2026-10-01', inflow: 0, outflow: 0, balance: 50, lines: [] },
];

const period = (from: string, to: string) =>
  ({
    from,
    to,
    inflow: 0,
    outflow: 0,
    balance: 0,
    factInflow: 0,
    factOutflow: 0,
    planInflow: 0,
    planOutflow: 0,
    isWeekend: false,
  }) as any;

describe('клетка календаря крупнее дня', () => {
  it('берёт ровно свои дни, включая границы', () => {
    const result = daysOfPeriod(DAYS as any, period('2026-09-01', '2026-09-30'));

    expect(result.map((day) => day.date)).toEqual([
      '2026-09-01',
      '2026-09-15',
      '2026-09-30',
    ]);
  });

  it('чужой день в клетку НЕ попадает', () => {
    // Иначе сумма клетки разойдётся с тем, что под ней раскрылось.
    const result = daysOfPeriod(DAYS as any, period('2026-09-01', '2026-09-30'));

    expect(result.map((day) => day.date)).not.toContain('2026-10-01');
  });

  it('пустой период не роняет разбор', () => {
    expect(daysOfPeriod(DAYS as any, period('2026-11-01', '2026-11-30'))).toEqual(
      [],
    );
    expect(daysOfPeriod(undefined as any, period('2026-09-01', '2026-09-30'))).toEqual(
      [],
    );
  });

  it('ЭКРАН ДЕЙСТВИТЕЛЬНО ЧИТАЕТ ПЕРИОДЫ', () => {
    // Сторож против возврата прежней поломки: переключатель масштаба,
    // который ничего не меняет, выглядит рабочим и не ловится ничем.
    const page = fs.readFileSync(
      path.resolve(__dirname, '..', 'PaymentCalendarPage.tsx'),
      'utf8',
    );

    expect(page).toContain('data?.periods');
    expect(page).toContain('PeriodRow');
  });

  it('разбор ответа НЕ ТЕРЯЕТ периоды', () => {
    const mapper = fs.readFileSync(
      path.resolve(__dirname, '..', 'mapForecast.ts'),
      'utf8',
    );

    expect(mapper).toContain('periods:');
    expect(mapper).toContain('mapPeriod');
  });
});
