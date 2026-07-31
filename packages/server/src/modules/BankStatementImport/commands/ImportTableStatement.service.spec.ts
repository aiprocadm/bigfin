import { ImportTableStatementService } from './ImportTableStatement.service';

const csv = (rows: string[][]): Buffer =>
  Buffer.from(rows.map((r) => r.join(';')).join('\r\n'), 'utf8');

const SAMPLE = csv([
  ['Дата', 'Сумма', 'Назначение', 'Контрагент'],
  ['01.06.2026', '1000', 'Поступление', 'ООО Ромашка'],
  ['02.06.2026', '-250,40', 'Списание', 'ООО Поставщик'],
]);

/** Заглушки: таблица необработанных операций + сервис создания. */
function makeDeps(existing: any[] = []) {
  const rows = [...existing];

  const uncategorizedModel = () => ({
    query: () => ({
      findOne: (where: any) =>
        Promise.resolve(
          rows.find((r) =>
            Object.entries(where).every(([k, v]) => r[k] === v),
          ) ?? undefined,
        ),
    }),
  });
  const createUncategorized = {
    create: jest.fn(async (dto: any) => {
      rows.push({ accountId: dto.accountId, externalId: dto.externalId, ...dto });
      return { id: rows.length };
    }),
  };
  const uow = { withTransaction: (fn: any) => fn({} as any) };

  const service = new ImportTableStatementService(
    uow as any,
    createUncategorized as any,
    uncategorizedModel as any,
  );
  return { service, rows, createUncategorized };
}

describe('ImportTableStatementService.preview', () => {
  it('показывает операции и не пишет в базу', async () => {
    const { service, createUncategorized } = makeDeps();

    const report = await service.preview(7, SAMPLE, 'v.csv');

    expect(report.total).toBe(2);
    expect(report.toImport).toBe(2);
    expect(report.duplicates).toBe(0);
    expect(report.columns.date).toBe('Дата');
    expect(report.sample).toHaveLength(2);
    expect(createUncategorized.create).not.toHaveBeenCalled();
  });

  it('уже импортированные строки помечает дубликатами', async () => {
    const deps = makeDeps();
    await deps.service.import(7, 'RUB', SAMPLE, 'v.csv');

    const report = await deps.service.preview(7, SAMPLE, 'v.csv');

    expect(report.duplicates).toBe(2);
    expect(report.toImport).toBe(0);
  });
});

describe('ImportTableStatementService.import', () => {
  it('создаёт операции со знаковой суммой', async () => {
    const { service, createUncategorized } = makeDeps();

    const result = await service.import(7, 'RUB', SAMPLE, 'v.csv');

    expect(result).toMatchObject({ imported: 2, skipped: 0 });
    const amounts = createUncategorized.create.mock.calls.map(
      (c: any[]) => c[0].amount,
    );
    expect(amounts).toEqual([1000, -250.4]);

    const first = createUncategorized.create.mock.calls[0][0];
    expect(first).toMatchObject({
      accountId: 7,
      currencyCode: 'RUB',
      date: '2026-06-01',
      payee: 'ООО Ромашка',
    });
  });

  it('повторный импорт того же файла ничего не добавляет', async () => {
    const deps = makeDeps();
    await deps.service.import(7, 'RUB', SAMPLE, 'v.csv');

    const again = await deps.service.import(7, 'RUB', SAMPLE, 'v.csv');

    expect(again).toMatchObject({ imported: 0, skipped: 2 });
    expect(deps.createUncategorized.create).toHaveBeenCalledTimes(2);
  });

  it('на нераспознанных колонках бросает понятную ошибку', async () => {
    const { service } = makeDeps();
    const bad = csv([
      ['Колонка A', 'Колонка B'],
      ['1', '2'],
    ]);

    await expect(service.import(7, 'RUB', bad, 'v.csv')).rejects.toThrow(
      /STATEMENT_COLUMNS_NOT_RECOGNIZED/,
    );
  });
});
