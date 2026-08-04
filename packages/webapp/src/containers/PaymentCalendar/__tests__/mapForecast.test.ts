import { describe, it, expect } from 'vitest';
import { mapForecast } from '../mapForecast';

/** Ответ сервера как есть — в snake_case. */
const serverResponse = {
  days: [
    { date: '2026-08-19', inflow: 0, outflow: 0, balance: 590000, lines: [] },
    {
      date: '2026-08-20',
      inflow: 0,
      outflow: 700000,
      balance: -110000,
      lines: [
        {
          date: '2026-08-20',
          direction: 'outflow',
          amount: 700000,
          label: 'Закупка оборудования',
          source: 'manual',
        },
      ],
    },
  ],
  gap: { date: '2026-08-20', amount: 110000, days_from_start: 16 },
  base_currency: 'RUB',
  opening_balance: 590000,
};

describe('разбор прогноза календаря', () => {
  it('берёт число дней до разрыва из snake_case', () => {
    const forecast = mapForecast(serverResponse);

    // Именно это терялось: предупреждение выводилось как «через дн.».
    expect(forecast.gap).toEqual({
      date: '2026-08-20',
      amount: 110000,
      daysFromStart: 16,
    });
  });

  it('понимает и camelCase, если сервер отдаст его', () => {
    const forecast = mapForecast({
      ...serverResponse,
      gap: { date: '2026-08-20', amount: 110000, daysFromStart: 16 },
    });

    expect(forecast.gap?.daysFromStart).toBe(16);
  });

  it('разрыв в первый же день не теряется', () => {
    const forecast = mapForecast({
      ...serverResponse,
      gap: { date: '2026-08-04', amount: 5000, days_from_start: 0 },
    });

    expect(forecast.gap?.daysFromStart).toBe(0);
  });

  it('без разрыва отдаёт пусто', () => {
    const forecast = mapForecast({ ...serverResponse, gap: null });

    expect(forecast.gap).toBeNull();
  });

  it('переносит остаток на начало и валюту', () => {
    const forecast = mapForecast(serverResponse);

    expect(forecast.openingBalance).toBe(590000);
    expect(forecast.baseCurrency).toBe('RUB');
  });

  it('дни и строки операций сохраняются', () => {
    const forecast = mapForecast(serverResponse);

    expect(forecast.days).toHaveLength(2);
    expect(forecast.days[1].balance).toBe(-110000);
    expect(forecast.days[1].lines[0]).toMatchObject({
      direction: 'outflow',
      amount: 700000,
      label: 'Закупка оборудования',
    });
  });

  it('строковые суммы из ответа считаются числами', () => {
    const forecast = mapForecast({
      days: [{ date: '2026-08-20', balance: '-110000', lines: [] }],
      gap: { date: '2026-08-20', amount: '110000', days_from_start: '16' },
    });

    expect(forecast.days[0].balance).toBe(-110000);
    expect(forecast.gap?.amount).toBe(110000);
    expect(forecast.gap?.daysFromStart).toBe(16);
  });

  it('пустой ответ не роняет страницу', () => {
    const forecast = mapForecast(undefined);

    expect(forecast.days).toEqual([]);
    expect(forecast.gap).toBeNull();
    expect(forecast.openingBalance).toBe(0);
  });
});
