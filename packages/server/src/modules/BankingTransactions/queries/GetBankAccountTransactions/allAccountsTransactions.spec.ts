// © 2026 Bigfin
import { GetBankAccountTransactionsRepository } from './GetBankAccountTransactionsRepo.service';

/**
 * Этап 3 ТЗ, шаг 3.2. Список операций по ВСЕМ счетам.
 *
 * До этого шага список операций существовал только внутри одного счёта:
 * `accountId` был обязательным в запросе, а сам запрос всегда ставил
 * `where account_id = …`. Экрана «все операции» в продукте не было вовсе —
 * из-за этого главный пункт меню собственника (этап 1) вести было некуда.
 *
 * Теперь счёт — обычный отбор. Проверяем две вещи, которые легко сломать
 * обратно: без счёта запрос НЕ ограничивается счётом, а входящий остаток
 * (он же начало бегущего итога) в этом случае не считается вовсе — по разным
 * счетам накопительный итог не имеет смысла.
 */

/** Простейший «запрос», который просто записывает наложенные условия. */
const makeQuery = () => {
  const calls: any[][] = [];
  const query: any = {
    where: (...args: any[]) => {
      // Вложенная группа условий: разворачиваем её тем же способом.
      if (typeof args[0] === 'function') {
        const nested = makeQuery();
        args[0](nested.query);
        calls.push(['group', nested.calls]);
      } else {
        calls.push(['where', ...args]);
      }
      return query;
    },
    orWhere: (...args: any[]) => {
      calls.push(['orWhere', ...args]);
      return query;
    },
    andWhere: (...args: any[]) => {
      calls.push(['andWhere', ...args]);
      return query;
    },
  };
  return { query, calls };
};

/** Репозиторий без моделей: для наложения отборов они не нужны. */
const makeRepo = (query: any) => {
  // Две последние модели — счета покупателям и поставщикам: по ним
  // хранилище догружает документы строк ради состояний (FIN-003).
  const repo = new GetBankAccountTransactionsRepository(
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    // Подключение к базе — для следа автоправил (FT-036); отборам не нужно.
    null as any,
  );
  repo.setQuery(query);
  return repo;
};

const applyFilters = (repo: any, query: any) => repo.applyFilters(query);

describe('список операций по всем счетам', () => {
  it('без счёта условие по счёту не накладывается', () => {
    const repo = makeRepo({ page: 1, pageSize: 50 } as any);
    const { query, calls } = makeQuery();

    applyFilters(repo, query);

    expect(calls).toEqual([]);
  });

  it('со счётом условие по счёту остаётся прежним', () => {
    const repo = makeRepo({ page: 1, pageSize: 50, accountId: 7 } as any);
    const { query, calls } = makeQuery();

    applyFilters(repo, query);

    expect(calls).toEqual([['where', 'account_id', 7]]);
  });

  it('период накладывается двумя границами', () => {
    const repo = makeRepo({
      page: 1,
      pageSize: 50,
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
    } as any);
    const { query, calls } = makeQuery();

    applyFilters(repo, query);

    expect(calls).toEqual([
      ['where', 'date', '>=', '2026-01-01'],
      ['where', 'date', '<=', '2026-01-31'],
    ]);
  });

  it('приход ищется по дебету, расход — по кредиту', () => {
    const inRepo = makeRepo({ page: 1, pageSize: 50, flow: 'in' } as any);
    const inQuery = makeQuery();
    applyFilters(inRepo, inQuery.query);
    expect(inQuery.calls).toEqual([['where', 'debit', '>', 0]]);

    const outRepo = makeRepo({ page: 1, pageSize: 50, flow: 'out' } as any);
    const outQuery = makeQuery();
    applyFilters(outRepo, outQuery.query);
    expect(outQuery.calls).toEqual([['where', 'credit', '>', 0]]);
  });

  it('поиск идёт по номеру, номеру-ссылке и примечанию', () => {
    const repo = makeRepo({ page: 1, pageSize: 50, search: 'аренда' } as any);
    const { query, calls } = makeQuery();

    applyFilters(repo, query);

    expect(calls).toEqual([
      [
        'group',
        [
          ['where', 'transaction_number', 'like', '%аренда%'],
          ['orWhere', 'reference_number', 'like', '%аренда%'],
          ['orWhere', 'note', 'like', '%аренда%'],
        ],
      ],
    ]);
  });

  it('без счёта входящий остаток не считается и равен нулю', async () => {
    const repo = makeRepo({ page: 1, pageSize: 50 } as any);

    // Модели не переданы вовсе: если метод полезет в базу — тест упадёт.
    await repo.initCashflowAccountOpeningBalance();

    expect(repo.openingBalance).toBe(0);
  });
});
