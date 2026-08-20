// © 2026 Bigfin
import { CreateManualJournalService } from './CreateManualJournal.service';
import { CommandManualJournalValidators } from './CommandManualJournalValidators.service';

/**
 * Р1 срез 3 (карта v16). При создании проверялись только счета, а курс был
 * необязательным полем с молчаливой единицей: долларовая проводка уходила в
 * журнал один к одному с рублём.
 */
const accountModel: any = () => ({
  query: () => ({
    whereIn: () =>
      Promise.resolve([
        { id: 1, currencyCode: 'RUB' },
        { id: 2, currencyCode: 'RUB' },
      ]),
    findOne: () => Promise.resolve({ id: 999 }),
  }),
});
/** Заглушка построителя запросов: цепочка возвращает себя, await — строки. */
const listStub = (rows: any[]) => {
  const builder: any = {};
  ['where', 'whereIn', 'whereNot', 'onBuild'].forEach((m) => {
    builder[m] = (arg: any) => {
      if (m === 'onBuild' && typeof arg === 'function') arg(builder);
      return builder;
    };
  });
  builder.then = (res: any, rej: any) => Promise.resolve(rows).then(res, rej);
  return builder;
};
const emptyModel: any = () => ({ query: () => listStub([]) });

const makeService = () => {
  const upsertGraph = jest.fn((obj: any) => Promise.resolve(obj));
  const journalModel: any = () => ({ query: () => ({ upsertGraph }) });
  const validator = new CommandManualJournalValidators(
    accountModel,
    emptyModel,
    emptyModel,
  );
  const service = new CreateManualJournalService(
    {
      getTenant: async () => ({ metadata: { baseCurrency: 'RUB' } }),
      getSystemUser: async () => ({ id: 7 }),
    } as any,
    { emitAsync: jest.fn() } as any,
    { withTransaction: (cb: any) => cb({}) } as any,
    validator,
    { getNextJournalNumber: () => 'JE-1' } as any,
    { transformDTO: async (dto: any) => dto } as any,
    journalModel,
  );
  return { service, upsertGraph };
};

const dto = (over: Record<string, any> = {}): any => ({
  date: '2026-08-20',
  journalNumber: 'JE-1',
  currencyCode: 'USD',
  entries: [
    { index: 1, accountId: 1, debit: 1000, credit: 0 },
    { index: 2, accountId: 2, debit: 0, credit: 1000 },
  ],
  ...over,
});

describe('создание ручной проводки — курс валюты', () => {
  it('не создаёт валютную проводку без курса', async () => {
    const { service, upsertGraph } = makeService();

    await expect(service.makeJournalEntries(dto())).rejects.toMatchObject({
      errorType: 'EXCHANGE_RATE_REQUIRED',
    });
    expect(upsertGraph).not.toHaveBeenCalled();
  });

  it('создаёт валютную проводку с курсом и сохраняет этот курс', async () => {
    const { service, upsertGraph } = makeService();

    await service.makeJournalEntries(dto({ exchangeRate: 80 }));

    expect(upsertGraph).toHaveBeenCalledWith(
      expect.objectContaining({ currencyCode: 'USD', exchangeRate: 80 }),
    );
  });

  it('проводке в базовой валюте ставит курс единицу', async () => {
    const { service, upsertGraph } = makeService();

    await service.makeJournalEntries(dto({ currencyCode: 'RUB' }));

    expect(upsertGraph).toHaveBeenCalledWith(
      expect.objectContaining({ currencyCode: 'RUB', exchangeRate: 1 }),
    );
  });
});
