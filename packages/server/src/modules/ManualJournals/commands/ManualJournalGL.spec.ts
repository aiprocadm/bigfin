// © 2026 Bigfin
import { ManualJournalGL } from './ManualJournalGL';

/**
 * Р1 срез 3 (карта v16). Ручная проводка в валюте клала суммы в журнал
 * БЕЗ умножения на курс: 1000 USD при курсе 80 записывались как 1000 ₽.
 * Дебет с кредитом при этом сходились, поэтому ошибка была бесшумной.
 */
const journal = (overrides: Record<string, any> = {}): any => ({
  id: 1,
  journalNumber: 'JE-1',
  reference: null,
  createdAt: '2026-08-20',
  date: '2026-08-20',
  currencyCode: 'USD',
  exchangeRate: 80,
  userId: 1,
  entries: [
    {
      index: 1,
      accountId: 10,
      debit: 1000,
      credit: 0,
      account: { accountNormal: 'debit' },
    },
    {
      index: 2,
      accountId: 11,
      debit: 0,
      credit: 1000,
      account: { accountNormal: 'credit' },
    },
  ],
  ...overrides,
});

describe('ManualJournalGL — суммы уходят в журнал в базовой валюте', () => {
  it('умножает дебет и кредит на курс', () => {
    const gl = new ManualJournalGL(journal()).setBaseCurrencyCode('RUB');

    const entries = gl.getManualJournalGLEntries();

    expect(entries[0].debit).toBe(80000);
    expect(entries[1].credit).toBe(80000);
  });

  it('проводка в базовой валюте без курса остаётся как есть', () => {
    const gl = new ManualJournalGL(
      journal({ currencyCode: 'RUB', exchangeRate: null }),
    ).setBaseCurrencyCode('RUB');

    const entries = gl.getManualJournalGLEntries();

    expect(entries[0].debit).toBe(1000);
    expect(entries[1].credit).toBe(1000);
  });

  it('валютная проводка без курса падает, а не считается один к одному', () => {
    const gl = new ManualJournalGL(
      journal({ currencyCode: 'USD', exchangeRate: null }),
    ).setBaseCurrencyCode('RUB');

    expect(() => gl.getManualJournalGLEntries()).toThrow(
      expect.objectContaining({ errorType: 'EXCHANGE_RATE_REQUIRED' }),
    );
  });
});
