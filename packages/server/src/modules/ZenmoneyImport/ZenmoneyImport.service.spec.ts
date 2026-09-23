import { ZenmoneyImportService } from './ZenmoneyImport.service';

/**
 * Импорт операций Дзенмани (⑨b).
 *
 * Главное правило — забирать только новое. diff-API для того и устроен:
 * без сохранённой метки каждый импорт заново тянул бы всю историю, а у
 * активного пользователя это годы операций при каждом нажатии кнопки.
 */
const tx = (over: Record<string, any> = {}) => ({
  id: 'zm-1',
  date: '2026-08-01',
  income: 0,
  outcome: 1500,
  payee: 'Кофейня',
  comment: 'Кофе',
  ...over,
});

function makeDeps(
  diff: { transactions: any[]; serverTimestamp: number },
  opts: { since?: number; existing?: any[] } = {},
) {
  const existing = opts.existing ?? [];
  const created: any[] = [];
  let savedTimestamp: number | null = null;

  const api = { getTransactions: jest.fn().mockResolvedValue(diff) };
  const settings = {
    getToken: jest.fn().mockResolvedValue('TOKEN'),
    getServerTimestamp: jest.fn().mockResolvedValue(opts.since ?? 0),
    setServerTimestamp: jest.fn(async (value: number) => {
      savedTimestamp = value;
    }),
  };
  const uncategorizedModel = () => ({
    query: () => ({
      findOne: (where: any) =>
        Promise.resolve(
          existing.find((r) => r.externalId === where.externalId) ?? undefined,
        ),
    }),
  });
  const createUncategorized = {
    create: jest.fn(async (dto: any) => {
      created.push(dto);
      return dto;
    }),
  };
  const uow = { withTransaction: (cb: any) => cb({}) };

  const service = new ZenmoneyImportService(
    uow as any,
    api as any,
    settings as any,
    createUncategorized as any,
    // Пакеты импорта (FT-043): дубль ищется по тем же строкам.
    ((model: any) => ({
  open: async () => 1,
  close: async () => undefined,
  isDuplicate: async (accountId: number, externalId: string) =>
    Boolean(await model().query().findOne({ accountId, externalId })),
}))(uncategorizedModel) as any,
    uncategorizedModel as any,
  );
  return { service, api, settings, created, getSaved: () => savedTimestamp };
}

describe('ZenmoneyImportService', () => {
  it('первый импорт забирает историю с начала', async () => {
    const deps = makeDeps({ transactions: [tx()], serverTimestamp: 1000 });

    await deps.service.import(5, 'RUB');

    expect(deps.api.getTransactions).toHaveBeenCalledWith('TOKEN', 0);
  });

  it('следующий импорт продолжает с сохранённой метки, а не с нуля', async () => {
    const deps = makeDeps({ transactions: [], serverTimestamp: 2000 }, { since: 1000 });

    await deps.service.import(5, 'RUB');

    expect(deps.api.getTransactions).toHaveBeenCalledWith('TOKEN', 1000);
  });

  it('после импорта метка сдвигается вперёд', async () => {
    const deps = makeDeps({ transactions: [tx()], serverTimestamp: 2500 });

    await deps.service.import(5, 'RUB');

    expect(deps.getSaved()).toBe(2500);
  });

  it('метка не двигается, если сервер её не прислал', async () => {
    const deps = makeDeps({ transactions: [tx()], serverTimestamp: 0 }, { since: 1000 });

    await deps.service.import(5, 'RUB');

    expect(deps.settings.setServerTimestamp).not.toHaveBeenCalled();
  });

  it('операция попадает в «Разбор» с суммой, датой и контрагентом', async () => {
    const deps = makeDeps({ transactions: [tx()], serverTimestamp: 100 });

    const result = await deps.service.import(5, 'RUB');

    expect(result).toMatchObject({ imported: 1, skipped: 0 });
    expect(deps.created[0]).toMatchObject({
      accountId: 5,
      currencyCode: 'RUB',
      payee: 'Кофейня',
    });
    expect(deps.created[0].amount).toBeLessThan(0);
  });

  it('уже импортированная операция не задваивается', async () => {
    const deps = makeDeps(
      { transactions: [tx()], serverTimestamp: 100 },
      // Маппер добавляет к идентификатору источник — как он и лежит в базе.
      { existing: [{ externalId: 'zenmoney:zm-1' }] },
    );

    const result = await deps.service.import(5, 'RUB');

    expect(result).toMatchObject({ imported: 0, skipped: 1 });
    expect(deps.created).toHaveLength(0);
  });

  it('удалённые в Дзенмани операции пропускаются', async () => {
    const deps = makeDeps({
      transactions: [tx({ id: 'zm-2', deleted: true })],
      serverTimestamp: 100,
    });

    const result = await deps.service.import(5, 'RUB');

    expect(result).toMatchObject({ imported: 0, skipped: 1 });
  });

  it('операция без даты или суммы пропускается, а не ломает импорт', async () => {
    const deps = makeDeps({
      transactions: [
        tx({ id: 'zm-3', date: null }),
        tx({ id: 'zm-4', income: 0, outcome: 0 }),
        tx({ id: 'zm-5' }),
      ],
      serverTimestamp: 100,
    });

    const result = await deps.service.import(5, 'RUB');

    expect(result).toMatchObject({ imported: 1, skipped: 2 });
  });

  it('без подключения импорт не идёт в API', async () => {
    const deps = makeDeps({ transactions: [], serverTimestamp: 0 });
    deps.settings.getToken = jest.fn().mockResolvedValue(null);

    await expect(deps.service.import(5, 'RUB')).rejects.toBeDefined();
    expect(deps.api.getTransactions).not.toHaveBeenCalled();
  });
});
