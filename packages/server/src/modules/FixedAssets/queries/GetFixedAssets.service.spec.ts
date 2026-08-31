import knex from 'knex';
import { GetFixedAssetsService } from './GetFixedAssets.service';
import { FixedAsset } from '../models/FixedAsset.model';

/**
 * Р4 карты v43. Основные средства ищутся по названию.
 *
 * Список объектов растёт вместе с хозяйством, а найти в нём было нельзя
 * ничего: своего поля поиска у экрана нет, поиск в шапке раздел не знал.
 */
const sqlForFilter = async (filter: any): Promise<string> => {
  const kb = knex({ client: 'mysql2' })
    .queryBuilder()
    .from(FixedAsset.tableName);

  // Список строится без `onBuild` — запрос собирается прямо на модели,
  // поэтому подделка проксирует вызовы в настоящий строитель и умеет
  // «дожидаться» пустого ответа.
  const builder: any = {
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

  await new GetFixedAssetsService(model as any).getFixedAssets(filter);

  return kb.toString();
};

describe('поиск основных средств', () => {
  it('ищет по названию объекта', async () => {
    expect(await sqlForFilter({ keyword: 'станок' })).toContain(
      "`name` like '%станок%'",
    );
  });

  it('без запроса список не фильтруется поиском', async () => {
    expect(await sqlForFilter({})).not.toContain('like');
  });

  it('порядок списка не теряется из-за поиска', async () => {
    // Поиск добавляет условие, а не переписывает запрос: список объектов
    // по-прежнему идёт от свежих к старым.
    expect(await sqlForFilter({ keyword: 'станок' })).toContain('order by');
  });
});
