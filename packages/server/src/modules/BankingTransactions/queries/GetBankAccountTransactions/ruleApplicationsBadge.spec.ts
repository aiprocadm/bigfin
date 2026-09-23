// © 2026 Bigfin
import { GetBankAccountTransactionsRepository } from './GetBankAccountTransactionsRepo.service';

/**
 * Бейдж «А» в реестре (FT-036 ТЗ-3): какие операции страницы разнесло
 * автоправило. Одним запросом на страницу; последнее применение побеждает;
 * сбой не роняет реестр.
 */
function makeRepo(rows: any[] | Error) {
  const seen: any = {};
  const builder: any = {
    leftJoin: () => builder,
    whereIn: (_column: string, ids: number[]) => {
      seen.ids = ids;
      return builder;
    },
    select: () => builder,
    orderBy: () => (rows instanceof Error ? Promise.reject(rows) : Promise.resolve(rows)),
  };
  const knex = () => () => builder;
  const repo = new GetBankAccountTransactionsRepository(
    null as any, null as any, null as any, null as any, null as any, null as any, null as any,
    knex as any,
  );
  return { repo, seen };
}

describe('бейдж «А» в реестре', () => {
  it('страница: только денежные операции, последнее применение побеждает', async () => {
    const { repo, seen } = makeRepo([
      { transactionId: 5, ruleId: 1, name: 'Старое' },
      { transactionId: 5, ruleId: 2, name: 'Озон' },
      { transactionId: 6, ruleId: 3, name: null },
    ]);
    repo.transactions = [
      { referenceType: 'CashflowTransaction', referenceId: 5 },
      { referenceType: 'CashflowTransaction', referenceId: 6 },
      { referenceType: 'SaleInvoice', referenceId: 5 },
    ];
    await repo.initRuleApplications();
    expect(seen.ids).toEqual([5, 6]);
    expect(repo.ruleApplicationsByTransaction.get(5)).toEqual({ ruleId: 2, ruleName: 'Озон' });
    // Правило удалено — имени нет, но бейдж остаётся.
    expect(repo.ruleApplicationsByTransaction.get(6)).toEqual({ ruleId: 3, ruleName: null });
  });

  it('без денежных операций на странице — ни одного запроса', async () => {
    const { repo, seen } = makeRepo([]);
    repo.transactions = [{ referenceType: 'Bill', referenceId: 1 }];
    await repo.initRuleApplications();
    expect(seen.ids).toBeUndefined();
  });

  it('сбой чтения следа не роняет реестр', async () => {
    const { repo } = makeRepo(new Error('нет таблицы'));
    repo.transactions = [{ referenceType: 'CashflowTransaction', referenceId: 5 }];
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(repo.initRuleApplications()).resolves.toBeUndefined();
    expect(repo.ruleApplicationsByTransaction.size).toBe(0);
    spy.mockRestore();
  });
});
