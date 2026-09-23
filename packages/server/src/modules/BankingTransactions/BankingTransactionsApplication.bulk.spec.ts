// © 2026 Bigfin
import { BankingTransactionsApplication } from './BankingTransactionsApplication.service';

/**
 * Пакетный ввод «Несколько» (FT-024 ТЗ-3) и создание с частями (FT-023).
 * AC: 10 операций одним запросом; ошибка в строке 7 не мешает сохранить
 * первые 6 и говорит, что не так с седьмой.
 */
function makeApp(options: { failAt?: number } = {}) {
  const created: any[] = [];
  const splitCalls: any[] = [];
  const create = {
    newCashflowTransaction: async (dto: any, _userId: any, trx: any) => {
      if (options.failAt !== undefined && dto.description === `op-${options.failAt}`) {
        const error: any = new Error('Счёт не того вида');
        error.errorType = 'CREDIT_ACCOUNTS_HAS_INVALID_TYPE';
        throw error;
      }
      const row = { id: 100 + created.length, trx };
      created.push({ dto, trx });
      return row;
    },
  };
  const actions = { setSplits: async (...args: any[]) => splitCalls.push(args) };
  const uow = { withTransaction: async (fn: any) => fn('tx') };
  const none = {} as any;
  const app = new BankingTransactionsApplication(
    create as any,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    uow as any,
    actions as any,
  );
  return { app, created, splitCalls };
}

const item = (n: number, extra: Record<string, unknown> = {}) => ({
  date: '2026-09-10',
  transactionType: 'other_expense',
  description: `op-${n}`,
  amount: 100 + n,
  exchangeRate: 1,
  currencyCode: 'RUB',
  creditAccountId: 1021,
  cashflowAccountId: 1000,
  publish: true,
  ...extra,
});

describe('пакетный ввод операций (FT-024)', () => {
  it('10 строк одним запросом — 10 операций', async () => {
    const { app, created } = makeApp();
    const result = await app.createTransactionsBulk(Array.from({ length: 10 }, (_, i) => item(i + 1)));
    expect(result).toMatchObject({ created: 10, failed: 0 });
    expect(created).toHaveLength(10);
  });

  it('ошибка в строке 7: шесть до неё и три после сохранены, седьмая объяснена', async () => {
    const { app, created } = makeApp({ failAt: 7 });
    const result = await app.createTransactionsBulk(Array.from({ length: 10 }, (_, i) => item(i + 1)));
    expect(result.created).toBe(9);
    expect(created.map((c) => c.dto.description)).not.toContain('op-7');
    expect(result.results[6]).toEqual({
      index: 6,
      error: 'CREDIT_ACCOUNTS_HAS_INVALID_TYPE',
      message: 'Счёт не того вида',
    });
  });

  it('недозаполненная строка не роняет пакет и называет поля', async () => {
    const { app } = makeApp();
    const result = await app.createTransactionsBulk([item(1), { description: 'пусто' }, item(3)]);
    expect(result.created).toBe(2);
    const bad: any = result.results[1];
    expect(bad.error).toBe('VALIDATION_FAILED');
    expect(bad.fields).toEqual(expect.arrayContaining(['date', 'amount', 'cashflowAccountId']));
  });

  it('строка с частями создаётся вместе с разбиением в одной транзакции', async () => {
    const { app, created, splitCalls } = makeApp();
    await app.createTransactionsBulk([
      item(1, { amount: 1000, splits: [{ amount: 600, articleId: 10 }, { amount: 400, articleId: 11 }] }),
    ]);
    expect(created[0].trx).toBe('tx');
    expect(splitCalls[0][0]).toBe(100);
    expect(splitCalls[0][1]).toEqual([
      { amount: 600, articleId: 10, projectId: null },
      { amount: 400, articleId: 11, projectId: null },
    ]);
    expect(splitCalls[0][2]).toBe('tx');
  });
});
