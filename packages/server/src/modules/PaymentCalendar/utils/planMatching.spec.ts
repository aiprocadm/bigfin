// © 2026 Bigfin
import { autoConfirmHint, matchedOccurrence, pickPlanForFact } from './planMatching';

/**
 * FT-052 ТЗ-3. AC: факт, совпадающий по счёту, контрагенту, сумме и дате
 * ±3 дня, закрывает план.
 */
describe('автоподтверждение плана фактом', () => {
  const plan = {
    id: 1,
    direction: 'outflow',
    amount: 50_000,
    plannedDate: '2026-10-10',
    accountId: 1000,
    contactId: 7,
    matchExactAmount: true,
  };
  const fact = { direction: 'outflow' as const, amount: 50_000, date: '2026-10-12', accountId: 1000, contactId: 7 };

  it('AC: счёт, контрагент, сумма и дата ±3 дня — совпало', () => {
    expect(matchedOccurrence(plan, fact)).toBe('2026-10-10');
  });

  it.each([
    ['дата дальше 3 дней', { date: '2026-10-14' }],
    ['другой счёт', { accountId: 1001 }],
    ['другой контрагент', { contactId: 8 }],
    ['другое направление', { direction: 'inflow' as const }],
    ['сумма на копейку другая при точном совпадении', { amount: 50_000.01 }],
  ])('не совпало: %s', (_label, patch) => {
    expect(matchedOccurrence(plan, { ...fact, ...patch })).toBeNull();
  });

  it('без точного совпадения — допуск 5 %; «с любым контрагентом» — контрагент не нужен', () => {
    const loose = { ...plan, matchExactAmount: false, matchAnyContact: true, contactId: null };
    expect(matchedOccurrence(loose, { ...fact, amount: 52_000, contactId: 99 })).toBe('2026-10-10');
    expect(matchedOccurrence(loose, { ...fact, amount: 53_000 })).toBeNull();
  });

  it('повтор: подтверждается ближайшее вхождение', () => {
    const monthly = { ...plan, recurrence: { frequency: 'monthly', interval: 1 } };
    expect(matchedOccurrence(monthly, { ...fact, date: '2026-12-09' })).toBe('2026-12-10');
  });

  it('из двух подходящих планов — ближайший по дате', () => {
    const picked = pickPlanForFact([plan, { ...plan, id: 2, plannedDate: '2026-10-12' }], fact);
    expect(picked).toEqual({ plan: expect.objectContaining({ id: 2 }), occurrence: '2026-10-12' });
  });

  it('подсказка: что заполнить, чтобы сработало', () => {
    expect(autoConfirmHint({ amount: 100, plannedDate: '2026-10-10' })).toEqual({
      ready: false,
      missing: ['account', 'contact'],
    });
    expect(autoConfirmHint({ ...plan, matchAnyContact: true, contactId: null })).toEqual({ ready: true, missing: [] });
  });
});
