import { nextOccurrenceAfter } from './expandRecurrence';

/**
 * О3 (карта v13): следующее вхождение повторяющегося плана после даты.
 */
describe('nextOccurrenceAfter', () => {
  it('ежемесячно: следующее вхождение через месяц от якоря', () => {
    expect(
      nextOccurrenceAfter(
        { frequency: 'monthly', interval: 1 },
        '2026-09-01',
        '2026-09-01',
      ),
    ).toBe('2026-10-01');
  });

  it('шагает от якоря, пока не перепрыгнет указанную дату', () => {
    expect(
      nextOccurrenceAfter(
        { frequency: 'weekly', interval: 2 },
        '2026-09-01',
        '2026-09-29',
      ),
    ).toBe('2026-10-13');
  });

  it('после даты окончания вхождений нет', () => {
    expect(
      nextOccurrenceAfter(
        { frequency: 'monthly', interval: 1, endDate: '2026-09-15' },
        '2026-09-01',
        '2026-09-01',
      ),
    ).toBeNull();
  });

  it('короткий месяц прижимает день так же, как разворачивание повторов', () => {
    expect(
      nextOccurrenceAfter(
        { frequency: 'monthly', interval: 1 },
        '2026-01-31',
        '2026-01-31',
      ),
    ).toBe('2026-02-28');
  });
});
