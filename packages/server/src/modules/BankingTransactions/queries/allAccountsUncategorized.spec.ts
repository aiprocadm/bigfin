// © 2026 Bigfin
import { GetUncategorizedTransactions } from './GetUncategorizedTransactions';

/**
 * Этап 3 ТЗ, шаг 3.4. Операции, ждущие разноски, по ВСЕМ счетам.
 *
 * Полоса «N операций без статьи» на экране «Операции» — вход в разноску.
 * Собрать её было невозможно: непроведённые операции отдавались только по
 * одному счёту (`GET /banking/uncategorized/accounts/:accountId`), и чтобы
 * узнать общее число, пришлось бы обойти все счета запросами.
 *
 * Проверяем, что без счёта условие по счёту не накладывается, а со счётом —
 * остаётся прежним. Остальные условия (не исключена, не в ожидании, не
 * разнесена) обязаны сохраняться в обоих случаях.
 */

/** Построитель запроса, записывающий наложенные условия. */
const makeBuilder = () => {
  const calls: any[][] = [];
  const builder: any = {
    where: (...args: any[]) => {
      calls.push(['where', ...args]);
      return builder;
    },
    whereNull: (...args: any[]) => {
      calls.push(['whereNull', ...args]);
      return builder;
    },
    modify: (...args: any[]) => {
      calls.push(['modify', ...args]);
      return builder;
    },
    withGraphFetched: (...args: any[]) => {
      calls.push(['withGraphFetched', ...args]);
      return builder;
    },
    withGraphJoined: (...args: any[]) => {
      calls.push(['withGraphJoined', ...args]);
      return builder;
    },
    orderBy: (...args: any[]) => {
      calls.push(['orderBy', ...args]);
      return builder;
    },
  };
  return { builder, calls };
};

/** Модель, которая только прогоняет `onBuild` и отдаёт пустую страницу. */
const makeModel = (builderCalls: any[][]) => () => ({
  query: () => {
    const chain: any = {
      onBuild: (callback: (q: any) => void) => {
        const { builder, calls } = makeBuilder();
        callback(builder);
        builderCalls.push(...calls);
        return chain;
      },
      pagination: async () => ({ results: [], pagination: { total: 0 } }),
    };
    return chain;
  },
});

const makeService = (builderCalls: any[][]) =>
  new GetUncategorizedTransactions(
    { transform: async () => [] } as any,
    makeModel(builderCalls) as any,
  );

describe('операции, ждущие разноски, по всем счетам', () => {
  it('без счёта условие по счёту не накладывается', async () => {
    const calls: any[][] = [];

    await makeService(calls).getTransactions(undefined, {} as any);

    const accountConditions = calls.filter(
      ([method, column]) => method === 'where' && column === 'accountId',
    );
    expect(accountConditions).toEqual([]);
  });

  it('со счётом условие по счёту остаётся', async () => {
    const calls: any[][] = [];

    await makeService(calls).getTransactions(7, {} as any);

    expect(calls).toContainEqual(['where', 'accountId', 7]);
  });

  it('прочие условия сохраняются и без счёта', async () => {
    const calls: any[][] = [];

    await makeService(calls).getTransactions(undefined, {} as any);

    // Разнесённые, исключённые и ожидающие в список не попадают —
    // иначе счётчик «ждут разноски» врал бы.
    expect(calls).toContainEqual(['where', 'categorized', false]);
    expect(calls).toContainEqual(['modify', 'notExcluded']);
    expect(calls).toContainEqual(['modify', 'notPending']);
  });
});
