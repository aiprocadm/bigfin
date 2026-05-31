import { expandRecurrence } from './expandRecurrence';

describe('expandRecurrence', () => {
  it('expands a monthly rule from the anchor across the horizon', () => {
    const dates = expandRecurrence(
      { frequency: 'monthly', interval: 1 },
      '2026-06-05', // anchor
      '2026-06-01', // range start
      '2026-08-31', // range end
    );
    expect(dates).toEqual(['2026-06-05', '2026-07-05', '2026-08-05']);
  });

  it('stops at the rule end date', () => {
    const dates = expandRecurrence(
      { frequency: 'monthly', interval: 1, endDate: '2026-07-10' },
      '2026-06-05',
      '2026-06-01',
      '2026-12-31',
    );
    expect(dates).toEqual(['2026-06-05', '2026-07-05']);
  });

  it('skips occurrences before the range start', () => {
    const dates = expandRecurrence(
      { frequency: 'weekly', interval: 1 },
      '2026-06-01',
      '2026-06-15',
      '2026-06-30',
    );
    expect(dates).toEqual(['2026-06-15', '2026-06-22', '2026-06-29']);
  });

  it('respects the interval (every 2 weeks)', () => {
    const dates = expandRecurrence(
      { frequency: 'weekly', interval: 2 },
      '2026-06-01',
      '2026-06-01',
      '2026-06-30',
    );
    expect(dates).toEqual(['2026-06-01', '2026-06-15', '2026-06-29']);
  });

  it('returns empty when the anchor is after the range end', () => {
    const dates = expandRecurrence(
      { frequency: 'daily', interval: 1 },
      '2026-09-01',
      '2026-06-01',
      '2026-06-30',
    );
    expect(dates).toEqual([]);
  });
});
