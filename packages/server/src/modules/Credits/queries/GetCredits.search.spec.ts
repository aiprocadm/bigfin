import knex from 'knex';
import { GetCreditsService } from './GetCredits.service';
import { Credit } from '../models/Credit.model';

/**
 * Ш1 карты v48. Кредиты ищутся по названию.
 *
 * Задел карт v39 и v43: шесть разделов не ищутся никак — ни своим полем на
 * экране, ни поиском в шапке. Механизм готов с карты v43, остались сами
 * разделы.
 */
const sqlFor = (filter: any): string => {
  const kb = knex({ client: 'mysql2' }).queryBuilder().from(Credit.tableName);

  const builder: any = {
    withGraphFetched: () => builder,
    where: (...args: any[]) => {
      kb.where(...(args as [any]));
      return builder;
    },
    orderBy: (...args: any[]) => {
      kb.orderBy(...(args as [any]));
      return builder;
    },
    then: (resolve: any) => resolve([]),
  };
  const model = () => ({ query: () => builder });

  new GetCreditsService(model as any).getCredits(filter);

  return kb.toString();
};

describe('поиск кредитов', () => {
  it('ищет по названию кредита', () => {
    expect(sqlFor({ keyword: 'Сбербанк' })).toContain(
      "`name` like '%Сбербанк%'",
    );
  });

  it('без запроса список не фильтруется поиском', () => {
    expect(sqlFor({})).not.toContain('like');
  });

  it('порядок списка не теряется из-за поиска', () => {
    expect(sqlFor({ keyword: 'Сбербанк' })).toContain('order by');
  });
});
