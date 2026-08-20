// © 2026 Bigfin
import { ManualJournalGLEntries } from './ManualJournalGLEntries';

/**
 * Р1 срез 3 (карта v16). Расчёт проводки должен знать базовую валюту
 * организации — иначе он не отличит валютную проводку от рублёвой и снова
 * посчитает доллары один к одному с рублём.
 */
const journalFixture = (overrides: Record<string, any> = {}): any => ({
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

const makeService = (journal: any) => {
  const commit = jest.fn();
  const modelProxy: any = () => ({
    query: () => ({
      findById: () => ({
        withGraphFetched: () => Promise.resolve(journal),
      }),
    }),
  });
  const ledgerStorage: any = { commit, deleteByReference: jest.fn() };
  const tenancyContext: any = {
    getTenantMetadata: async () => ({ baseCurrency: 'RUB' }),
  };
  const service = new ManualJournalGLEntries(
    modelProxy,
    ledgerStorage,
    tenancyContext,
  );
  return { service, commit };
};

describe('ManualJournalGLEntries — базовая валюта доходит до расчёта', () => {
  it('кладёт в журнал суммы, пересчитанные по курсу', async () => {
    const { service, commit } = makeService(journalFixture());

    await service.createManualJournalGLEntries(1);

    const ledger = commit.mock.calls[0][0];
    expect(ledger.getEntries()[0].debit).toBe(80000);
  });

  it('валютную проводку без курса в журнал не пишет', async () => {
    const { service, commit } = makeService(
      journalFixture({ exchangeRate: null }),
    );

    await expect(service.createManualJournalGLEntries(1)).rejects.toEqual(
      expect.objectContaining({ errorType: 'EXCHANGE_RATE_REQUIRED' }),
    );
    expect(commit).not.toHaveBeenCalled();
  });
});
