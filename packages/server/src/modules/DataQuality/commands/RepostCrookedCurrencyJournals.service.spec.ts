// © 2026 Bigfin
import { RepostCrookedCurrencyJournalsService } from './RepostCrookedCurrencyJournals.service';

/**
 * Вопрос 28 карты v16. Перепроведение кривых валютных проводок — по явной
 * кнопке: журнал переписывается тем же кодом, каким это делает обычное
 * сохранение (после Р1 среза 3 он умножает на курс).
 */
const makeService = (opts: {
  journals: any[];
  glRows: any[];
  failOnId?: number;
}) => {
  const rewritten: number[] = [];
  const getService: any = {
    getCrookedCurrencyJournals: async () => {
      const { findCrookedCurrencyJournals } = await import(
        '../utils/findCrookedCurrencyJournals'
      );
      return findCrookedCurrencyJournals(opts.journals, opts.glRows, 'RUB');
    },
  };
  const manualJournalGLEntries: any = {
    editManualJournalGLEntries: async (id: number) => {
      if (id === opts.failOnId) throw new Error('boom');
      rewritten.push(id);
    },
  };
  const uow: any = { withTransaction: (cb: any) => cb({}) };
  const service = new RepostCrookedCurrencyJournalsService(
    getService,
    manualJournalGLEntries,
    uow,
  );
  return { service, rewritten };
};

const crooked = (id: number, amount = 1000) => ({
  id,
  journalNumber: `JE-${id}`,
  date: '2026-05-01',
  amount,
  currencyCode: 'USD',
  exchangeRate: 80,
});

describe('перепроведение кривых валютных проводок', () => {
  it('кривая проводка переписывается, итог честный', async () => {
    const { service, rewritten } = makeService({
      journals: [crooked(1)],
      glRows: [{ referenceId: 1, debit: 1000, credit: 0 }],
    });

    const result = await service.repost({});

    expect(rewritten).toEqual([1]);
    expect(result).toMatchObject({ candidates: 1, reposted: 1, failed: 0 });
  });

  it('правильная проводка не трогается вовсе', async () => {
    const { service, rewritten } = makeService({
      journals: [crooked(1)],
      glRows: [{ referenceId: 1, debit: 80000, credit: 0 }],
    });

    const result = await service.repost({});

    expect(rewritten).toEqual([]);
    expect(result).toMatchObject({ candidates: 0, reposted: 0 });
  });

  it('сбой на одной проводке не отменяет остальные и попадает в отчёт', async () => {
    const { service, rewritten } = makeService({
      journals: [crooked(1), crooked(2, 5000)],
      glRows: [
        { referenceId: 1, debit: 1000, credit: 0 },
        { referenceId: 2, debit: 5000, credit: 0 },
      ],
      failOnId: 2,
    });

    const result = await service.repost({});

    expect(rewritten).toEqual([1]);
    expect(result).toMatchObject({ candidates: 2, reposted: 1, failed: 1 });
    expect(result.failures[0]).toMatchObject({ journalId: 2 });
  });
});
