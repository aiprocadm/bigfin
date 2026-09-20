// © 2026 Bigfin
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { GetManagementArticlesService } from './GetManagementArticles.service';
import { GetManagementArticlesQueryDto } from '../dtos/GetManagementArticlesQuery.dto';
import { ARTICLE_KINDS } from '../constants';

/**
 * Отбор справочника статей по виду (приёмка 1 FIN-001 ТЗ-2).
 *
 * Сам отбор в службе был написан ещё под два вида. Здесь проверяется, что на
 * пяти он работает так же — и что ОПЕЧАТКА В ВИДЕ теперь отвергается, а не
 * отвечает правдоподобной пустотой.
 */
const forest = [
  { id: 1, name: 'Доходы', parentId: null, kind: 'income' },
  { id: 2, name: 'Выручка', parentId: 1, kind: 'income' },
  { id: 3, name: 'Расходы', parentId: null, kind: 'expense' },
  { id: 4, name: 'Активы', parentId: null, kind: 'asset' },
  { id: 5, name: 'Покупка основных средств', parentId: 4, kind: 'asset' },
  { id: 6, name: 'Обязательства', parentId: null, kind: 'liability' },
  { id: 7, name: 'Получение кредита', parentId: 6, kind: 'liability' },
  { id: 8, name: 'Капитал', parentId: null, kind: 'equity' },
];

const knexCountStub = () => () => {
  const q: any = {
    select: () => q,
    count: () => q,
    whereIn: () => q,
    groupBy: () => Promise.resolve([]),
  };
  return q;
};

/**
 * Подделка запроса, которая ЧЕСТНО применяет `where('kind', …)`.
 *
 * Проверять «позвали ли where» мало: так же зелено было бы при отборе по
 * не тому полю. Здесь отбор и правда сужает набор.
 */
const makeService = () => {
  const articleModel = () => ({
    query: () => {
      const state: { kind?: string } = {};
      const builder: any = {
        where: (column: string, value: string) => {
          if (column === 'kind') state.kind = value;
          return builder;
        },
        orderBy: () => builder,
        onBuild: (apply: any) => {
          apply(builder);
          const rows = state.kind
            ? forest.filter((row) => row.kind === state.kind)
            : forest;
          return Promise.resolve(rows);
        },
      };
      return builder;
    },
    knex: () => knexCountStub(),
  });

  return new GetManagementArticlesService(articleModel as any);
};

describe('отбор статей по виду', () => {
  it('без отбора отдаются все пять видов — прежнее поведение не изменилось', async () => {
    const res = await makeService().getManagementArticles({});

    expect(res.data).toHaveLength(forest.length);
  });

  it('каждый из пяти видов отбирается по отдельности', async () => {
    for (const kind of ARTICLE_KINDS) {
      const res = await makeService().getManagementArticles({ kind });
      const kinds = new Set(res.data.map((row: any) => row.kind));

      expect([...kinds]).toEqual([kind]);
    }
  });

  it('обязательства отдаются без чужих строк', async () => {
    const res = await makeService().getManagementArticles({
      kind: 'liability',
    });

    expect(res.data.map((row: any) => row.name)).toEqual([
      'Обязательства',
      'Получение кредита',
    ]);
  });

  it('деревом отдаётся целое поддерево нужного вида', async () => {
    const res = await makeService().getManagementArticles({
      kind: 'asset',
      tree: 'true',
    });

    expect(res.data).toHaveLength(1);
    expect((res.data[0] as any).name).toBe('Активы');
    expect((res.data[0] as any).children).toHaveLength(1);
  });
});

describe('опечатка в виде отвергается, а не отвечает пустотой', () => {
  const errorsFor = (query: Record<string, unknown>) =>
    validateSync(plainToInstance(GetManagementArticlesQueryDto, query));

  it('несуществующий вид не проходит проверку', () => {
    // Без этого `?kind=liabilty` вернул бы 200 и пустой список — экран
    // показал бы пустую вкладку, и человек поверил бы ей.
    const errors = errorsFor({ kind: 'liabilty' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('kind');
  });

  it('все пять настоящих видов проходят', () => {
    ARTICLE_KINDS.forEach((kind) => {
      expect(errorsFor({ kind })).toEqual([]);
    });
  });

  it('без вида отбора нет и проверять нечего', () => {
    expect(errorsFor({})).toEqual([]);
  });
});
