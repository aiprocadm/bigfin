// © 2026 Bigfin
import { taxDueDecide } from './taxDueDecide';

/**
 * Н4 карты v22 — напоминание о сроке уплаты налога.
 */
const estimate = {
  amount: 60_000,
  ratePercent: 6,
  dueDate: '2026-10-28',
};

describe('напоминание о налоге', () => {
  it('за неделю до срока напоминает', () => {
    const [candidate] = taxDueDecide(estimate, '2026-10-22');

    expect(candidate?.eventType).toBe('tax_due');
    expect(candidate?.payload).toMatchObject({
      amount: 60_000,
      ratePercent: 6,
      dueDate: '2026-10-28',
      daysLeft: 6,
    });
  });

  it('в сам день срока ещё напоминает — платить сегодня', () => {
    expect(taxDueDecide(estimate, '2026-10-28')).toHaveLength(1);
  });

  it('пока до срока далеко — молчит', () => {
    expect(taxDueDecide(estimate, '2026-10-01')).toEqual([]);
  });

  it('после срока не окликает — «заплатите вчера» бесполезно', () => {
    expect(taxDueDecide(estimate, '2026-10-29')).toEqual([]);
  });

  it('платить нечего — не тревожим', () => {
    expect(
      taxDueDecide({ ...estimate, amount: 0 }, '2026-10-22'),
    ).toEqual([]);
  });

  it('оценки нет — напоминать не о чем', () => {
    // null, а не отсутствие аргумента: так отвечает расчёт организации не
    // на упрощёнке.
    expect(taxDueDecide(null, '2026-10-22')).toEqual([]);
  });

  it('за каждый квартал напоминает отдельно', () => {
    const [q3] = taxDueDecide(estimate, '2026-10-22');
    const [q4] = taxDueDecide(
      { ...estimate, dueDate: '2027-03-28' },
      '2027-03-25',
    );

    expect(q3?.dedupKey).not.toBe(q4?.dedupKey);
    expect(q3?.dedupKey).toBe('tax_due:2026-10-28');
  });

  it('своё окно напоминания уважается', () => {
    // За 20 дней при обычной неделе — рано, при окне в 30 дней — пора.
    expect(taxDueDecide(estimate, '2026-10-08')).toEqual([]);
    expect(taxDueDecide(estimate, '2026-10-08', 30)).toHaveLength(1);
  });

  it('битые даты не роняют обход', () => {
    expect(taxDueDecide({ ...estimate, dueDate: 'скоро' }, '2026-10-22')).toEqual(
      [],
    );
    expect(taxDueDecide(estimate, 'сегодня')).toEqual([]);
  });

  it('бессмысленное окно заменяется недельным', () => {
    expect(taxDueDecide(estimate, '2026-10-22', -5)).toHaveLength(1);
    expect(taxDueDecide(estimate, '2026-10-01', Number.NaN)).toEqual([]);
  });
});
