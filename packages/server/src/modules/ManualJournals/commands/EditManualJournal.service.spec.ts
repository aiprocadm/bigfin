// © 2026 Bigfin
import { EditManualJournal } from './EditManualJournal.service';
import { CommandManualJournalValidators } from './CommandManualJournalValidators.service';

/**
 * Р1 срез 3 (карта v16). Проверка валюты вызывалась ТОЛЬКО при создании
 * проводки (`CreateManualJournal.service.ts`), а при правке — нет. Значит
 * запрет обходился в два шага: создать рублёвую, потом переписать в валютную.
 */
const accountModel: any = () => ({
  query: () => ({
    // Счета строк — в базовой валюте организации.
    whereIn: () =>
      Promise.resolve([
        { id: 1, currencyCode: 'RUB' },
        { id: 2, currencyCode: 'RUB' },
      ]),
    // Особых счетов «дебиторка/кредиторка» в этой пробе нет.
    findOne: () => Promise.resolve({ id: 999 }),
  }),
});
const emptyModel: any = () => ({
  query: () => ({
    whereIn: () => Promise.resolve([]),
    onBuild: () => Promise.resolve([]),
  }),
});

const makeService = () => {
  const upsertGraph = jest.fn(() => Promise.resolve({}));
  const builder: any = {
    findById: () => builder,
    throwIfNotFound: () => Promise.resolve({ id: 1, publishedAt: null }),
    withGraphFetched: () => Promise.resolve({ id: 1, entries: [] }),
    upsertGraph,
  };
  const journalModel: any = () => ({ query: () => builder });
  const validator = new CommandManualJournalValidators(
    accountModel,
    emptyModel,
    emptyModel,
  );
  const uow: any = { withTransaction: (cb: any) => cb({}) };
  const eventPublisher: any = { emitAsync: jest.fn() };
  const tenancyContext: any = {
    getTenantMetadata: async () => ({ baseCurrency: 'RUB' }),
  };
  const service = new EditManualJournal(
    eventPublisher,
    uow,
    validator,
    journalModel,
    tenancyContext,
  );
  return { service, upsertGraph };
};

const dto = (over: Record<string, any> = {}): any => ({
  date: '2026-08-20',
  currencyCode: 'USD',
  entries: [
    { index: 1, accountId: 1, debit: 1000, credit: 0 },
    { index: 2, accountId: 2, debit: 0, credit: 1000 },
  ],
  ...over,
});

describe('правка ручной проводки — валюту нельзя протащить мимо проверки', () => {
  it('не сохраняет валютную проводку без курса', async () => {
    const { service, upsertGraph } = makeService();

    await expect(service.editJournalEntries(1, dto())).rejects.toMatchObject({
      errorType: 'EXCHANGE_RATE_REQUIRED',
    });
    expect(upsertGraph).not.toHaveBeenCalled();
  });

  it('сохраняет валютную проводку с настоящим курсом', async () => {
    const { service, upsertGraph } = makeService();

    await service.editJournalEntries(1, dto({ exchangeRate: 80 }));

    expect(upsertGraph).toHaveBeenCalled();
  });
});
