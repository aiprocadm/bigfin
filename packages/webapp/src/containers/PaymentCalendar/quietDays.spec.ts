import { describe, expect, it } from 'vitest';

import { groupQuietDays } from './quietDays';

const day = (date: string, lines = 0) => ({
  date,
  inflow: 0,
  outflow: 0,
  balance: 100,
  lines: Array.from({ length: lines }, () => ({ label: 'x', amount: 1, direction: 'inflow' }) as any),
});

describe('пустые дни календаря свёрнуты (O10)', () => {
  it('серия пустых дней — одна строка, дни с движением — как есть', () => {
    const items = groupQuietDays(
      [day('2026-09-25', 1), day('2026-09-26'), day('2026-09-27'), day('2026-09-28'), day('2026-09-29', 2)],
      '2026-09-25',
    );
    expect(items.map((item) => item.kind)).toEqual(['day', 'quiet', 'day']);
    expect(items[1]).toMatchObject({ from: '2026-09-26', to: '2026-09-28' });
  });

  it('сегодня не сворачивается, даже пустое; одиночный пустой день — день', () => {
    const items = groupQuietDays(
      [day('2026-09-25'), day('2026-09-26'), day('2026-09-27', 1), day('2026-09-28')],
      '2026-09-25',
    );
    expect(items.map((item) => item.kind)).toEqual(['day', 'day', 'day', 'day']);
  });
});
