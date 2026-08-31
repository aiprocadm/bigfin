import knex from 'knex';
import { GetDealsService } from './GetDeals.service';
import { Deal } from '../models/Deal.model';

/**
 * Р2 карты v43. Сделки ищутся по названию.
 *
 * У раздела нет ни своего поля поиска на экране, ни поля поиска на
 * сервере: найти сделку в списке нельзя никак. Поиск в шапке — единственный
 * путь, и он для раздела молчал.
 */
const sqlForFilter = (filter: any): string => {
  const kb = knex({ client: 'mysql2' }).queryBuilder().from(Deal.tableName);

  // Поддельная модель по образцу соседних тестов, но внутрь `onBuild`
  // подставлен НАСТОЯЩИЙ строитель запроса: так виден живой SQL, а не факт
  // вызова.
  const builder: any = {
    onBuild: (cb: any) => {
      cb(builder);
      return builder;
    },
    modify: (name: string, arg: any) => {
      (Deal.modifiers as any)[name](kb, arg);
      return builder;
    },
    where: (...args: any[]) => {
      kb.where(...(args as [any]));
      return builder;
    },
    orderBy: (...args: any[]) => {
      kb.orderBy(...(args as [any]));
      return builder;
    },
  };
  const dealModel = () => ({ query: () => builder });

  new GetDealsService(dealModel as any).getDeals(filter);

  return kb.toString();
};

describe('поиск сделок', () => {
  it('ищет по названию сделки', () => {
    expect(sqlForFilter({ keyword: 'ремонт' })).toContain(
      "`name` like '%ремонт%'",
    );
  });

  it('без запроса список не фильтруется поиском', () => {
    expect(sqlForFilter({})).not.toContain('like');
  });

  it('поиск не размывает фильтр по состоянию сделки', () => {
    // Без скобок «или» из поиска склеилось бы с условием состояния, и
    // раздел показал бы сделки чужого состояния.
    const sql = sqlForFilter({ status: 'won', keyword: 'ремонт' });

    expect(sql).toContain("`status` = 'won'");
    expect(sql).toMatch(/`status` = 'won' and \(/);
  });
});
