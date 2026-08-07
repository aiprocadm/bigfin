// © 2026 Bigfin
import { getDefaultPLQuery, mergeQueryWithDefaults } from './utils';

describe('getDefaultPLQuery — метод учёта по умолчанию', () => {
  it('флаг accrual_pnl выключен → по начислению (легаси-поведение)', () => {
    expect(getDefaultPLQuery(false).basis).toBe('accrual');
  });

  it('флаг включен → кассовый (аудитория думает движением денег)', () => {
    expect(getDefaultPLQuery(true).basis).toBe('cash');
  });
});

describe('mergeQueryWithDefaults', () => {
  it('явный basis из запроса всегда важнее дефолта', () => {
    const q = mergeQueryWithDefaults({ basis: 'accrual' } as any, true);
    expect(q.basis).toBe('accrual');
  });

  it('без basis в запросе берётся дефолт по флагу', () => {
    expect(mergeQueryWithDefaults({} as any, true).basis).toBe('cash');
    expect(mergeQueryWithDefaults({} as any, false).basis).toBe('accrual');
  });
});
