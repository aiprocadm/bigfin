// © 2026 Bigfin
import { JournalSheetRepository } from './JournalSheetRepository';
import { REPORT_ROWS_LIMIT } from '../../common/reportRowsLimit';

/**
 * М3 срез 3 (карта v15): Журнал, как и Главная книга, тянул в память ВСЕ
 * проводки периода. Отказ обязан случаться ДО выборки строк.
 */
const buildRepository = (rowsCount: number, rows: any[] = []) => {
  const repository = new JournalSheetRepository() as any;

  repository.filter = { fromDate: '2026-01-01', toDate: '2026-12-31' };
  const calls = { counting: 0, selecting: 0 };

  repository.accountTransaction = () => ({
    query: () => ({
      onBuild: (callback: (query: any) => void) => {
        const builder: any = {
          modify: jest.fn(),
          orderBy: jest.fn(),
          where: jest.fn(),
          withGraphFetched: jest.fn(),
          count: jest.fn(),
        };
        callback(builder);

        if (builder.count.mock.calls.length > 0) {
          calls.counting += 1;
          return Promise.resolve([{ rowsCount }]);
        }
        calls.selecting += 1;
        return Promise.resolve(rows);
      },
    }),
  });
  return { repository, calls };
};

describe('потолок строк Журнала', () => {
  it('обычный журнал собирается как раньше', async () => {
    const rows = [
      { id: 1, accountId: 100, credit: 0, debit: 500, date: '2026-01-12' },
    ];
    const { repository, calls } = buildRepository(1, rows);

    await repository.initAccountTransactions();

    expect(repository.accountTransactions).toHaveLength(1);
    expect(calls.selecting).toBe(1);
  });

  it('строк больше потолка — отказ, и строки НЕ загружаются', async () => {
    const { repository, calls } = buildRepository(REPORT_ROWS_LIMIT + 1);
    let error: any;

    try {
      await repository.initAccountTransactions();
    } catch (caught) {
      error = caught;
    }
    expect(error?.errorType).toBe('REPORT_ROWS_LIMIT_EXCEEDED');
    expect(calls.selecting).toBe(0);
  });

  it('в отказе видно, сколько строк вышло', async () => {
    const { repository } = buildRepository(REPORT_ROWS_LIMIT + 42);
    let error: any;

    try {
      await repository.initAccountTransactions();
    } catch (caught) {
      error = caught;
    }
    expect(error?.payload?.rowsCount).toBe(REPORT_ROWS_LIMIT + 42);
  });
});
