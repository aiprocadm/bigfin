// © 2026 Bigfin
import {
  up,
  down,
  PL_TYPE_SEED_SYSTEM_ARTICLES,
  plTypeSeedMatchSystemArticles,
} from './20260923100100_seed_pl_type_for_system_articles';
import {
  BalanceManagementArticlesData,
  ManagementArticlesData,
} from '../seeds/data/managementArticles';
import { plTypeError } from '@/modules/ManagementArticles/utils/plTypes';

/**
 * Ярус управленческого ОПиУ у предустановленных статей (FT-009 ТЗ-3).
 *
 * Миграция данных ошибается ТИХО: проходит, записывается выполненной, а у
 * человека в отчёте все деньги оказываются в строке «Не отнесено к ярусу».
 * Поэтому проверяется поведение на поддельной базе, а не рассуждение.
 */

/** Ряды «как их видит продукт»: преобразователь имён отдаёт camelCase. */
type Row = {
  id: number;
  name: string;
  kind: string;
  parentId: number | null;
  seedKey: string | null;
  plType: string | null;
};

function makeKnex(rows: Row[], hasColumn = true) {
  const table = rows.map((row) => ({ ...row }));

  const knex: any = (name: string) => {
    expect(name).toBe('management_articles');
    const state: any = {};
    const api: any = {
      // Ответ в camelCase — как у настоящей базы с преобразователем имён.
      select: () => Promise.resolve(table.map((row) => ({ ...row }))),
      where: (column: string, value: any) => {
        state.where = { column, value };
        return api;
      },
      update: (patch: any) => {
        table
          .filter((row: any) => row[state.where.column] === state.where.value)
          .forEach((row) => {
            row.plType = patch.pl_type;
          });
        return Promise.resolve(1);
      },
    };
    return api;
  };
  knex.raw = () => Promise.resolve([[{ total: hasColumn ? 1 : 0 }]]);
  knex.table = table;
  return knex;
}

/** Организация, заведённая ДО 20.09: у доходов и расходов ключей нет. */
function oldOrganization(): Row[] {
  const plain = (
    id: number,
    name: string,
    kind: string,
    parentId: number | null,
  ): Row => ({ id, name, kind, parentId, seedKey: null, plType: null });

  return [
    plain(1, 'Доходы', 'income', null),
    plain(2, 'Выручка', 'income', 1),
    plain(3, 'Расходы', 'expense', null),
    plain(4, 'Себестоимость', 'expense', 3),
    plain(5, 'Аренда', 'expense', 3),
    plain(6, 'ФОТ', 'expense', 3),
    plain(7, 'Маркетинг', 'expense', 3),
    plain(8, 'Налоги', 'expense', 3),
    plain(9, 'Прочее', 'expense', 3),
    // Статья, заведённая человеком, — не системная.
    plain(12, 'Бухгалтерия на аутсорсе', 'expense', 3),
    // Балансовая с ключом — её добавила миграция этапа 17.
    { id: 13, name: 'Активы', kind: 'asset', parentId: null, seedKey: 'assets', plType: null },
  ];
}

/** Организация, заведённая ПОСЛЕ 20.09: у всех системных статей есть ключи. */
function newOrganization(): Row[] {
  return oldOrganization().map((row) => {
    const entry = PL_TYPE_SEED_SYSTEM_ARTICLES.find(
      (item) => item.name === row.name,
    );
    return entry ? { ...row, seedKey: entry.key } : row;
  });
}

const typeOf = (knex: any, id: number) =>
  knex.table.find((row: Row) => row.id === id).plType;

describe('таблица миграции совпадает с сидом', () => {
  it('те же ключи, имена, виды, родители и ярусы', () => {
    // Миграция держит СВОЮ копию — исторический документ. Сейчас копии
    // обязаны совпадать; разъедутся — новая и старая организации получат
    // разные ярусы у одной и той же статьи.
    const fromSeed = ManagementArticlesData.map((item: any) => ({
      key: item.key,
      name: item.name,
      kind: item.kind,
      parent: item.parent,
      plType: item.pl_type,
    }));
    const fromMigration = PL_TYPE_SEED_SYSTEM_ARTICLES.map((item) => ({
      ...item,
    }));

    expect(fromMigration).toEqual(fromSeed);
  });

  it('у каждой доходной и расходной статьи сида ярус задан и допустим', () => {
    ManagementArticlesData.forEach((item: any) => {
      expect(item.pl_type).toBeTruthy();
      expect(plTypeError(item.kind, item.pl_type)).toBeNull();
    });
  });

  it('у балансовых статей сида яруса нет', () => {
    BalanceManagementArticlesData.forEach((item: any) => {
      expect(item.pl_type).toBeUndefined();
    });
  });
});

describe('узнавание системных статей', () => {
  it('новая организация — по ключу, все девять', () => {
    expect(plTypeSeedMatchSystemArticles(newOrganization()).size).toBe(9);
  });

  it('старая организация без ключей — по подписи, все девять', () => {
    // Ради этого случая миграция и написана не «только по ключу».
    expect(plTypeSeedMatchSystemArticles(oldOrganization()).size).toBe(9);
  });

  it('переименованную статью не узнаёт — лучше без яруса, чем с чужим', () => {
    const rows = oldOrganization().map((row) =>
      row.id === 5 ? { ...row, name: 'Аренда офиса' } : row,
    );
    const found = plTypeSeedMatchSystemArticles(rows);

    expect(found.has('rent')).toBe(false);
    expect(found.size).toBe(8);
  });

  it('статью с системным именем, но под чужим родителем, не узнаёт', () => {
    const rows = oldOrganization().map((row) =>
      row.id === 5 ? { ...row, parentId: 12 } : row,
    );

    expect(plTypeSeedMatchSystemArticles(rows).has('rent')).toBe(false);
  });

  it('не узнав родителя, не узнаёт и детей', () => {
    const rows = oldOrganization().map((row) =>
      row.id === 3 ? { ...row, name: 'Затраты' } : row,
    );
    const found = plTypeSeedMatchSystemArticles(rows);

    expect(found.has('expense')).toBe(false);
    expect(found.has('rent')).toBe(false);
    expect(found.has('revenue')).toBe(true);
  });
});

describe('миграция: накат и откат', () => {
  it('старая организация получает ярусы всем девяти системным статьям', async () => {
    const knex = makeKnex(oldOrganization());

    await up(knex);

    expect(typeOf(knex, 2)).toBe('revenue');
    expect(typeOf(knex, 4)).toBe('direct_variable');
    expect(typeOf(knex, 7)).toBe('commercial');
    expect(typeOf(knex, 8)).toBe('below_ebitda');
    // Статья человека — без своего яруса: её ярус унаследуется от родителя
    // при расчёте, а не впишется сюда молча.
    expect(typeOf(knex, 12)).toBeNull();
    // Балансовая — без яруса.
    expect(typeOf(knex, 13)).toBeNull();
  });

  it('ярус, выбранный человеком, не перезаписывает', async () => {
    const rows = oldOrganization().map((row) =>
      row.id === 5 ? { ...row, plType: 'overhead_production' } : row,
    );
    const knex = makeKnex(rows);

    await up(knex);

    expect(typeOf(knex, 5)).toBe('overhead_production');
  });

  it('повторный прогон ничего не меняет', async () => {
    const knex = makeKnex(newOrganization());

    await up(knex);
    const first = knex.table.map((row: Row) => row.plType);
    await up(knex);

    expect(knex.table.map((row: Row) => row.plType)).toEqual(first);
  });

  it('откат снимает только поставленное миграцией', async () => {
    const knex = makeKnex(oldOrganization());

    await up(knex);
    // Человек успел поменять ярус «Аренды».
    knex.table.find((row: Row) => row.id === 5).plType = 'overhead_production';
    await down(knex);

    expect(typeOf(knex, 2)).toBeNull();
    expect(typeOf(knex, 5)).toBe('overhead_production');
  });

  it('без колонки не делает ничего и не падает', async () => {
    const knex = makeKnex(oldOrganization(), false);

    await up(knex);
    await down(knex);

    expect(knex.table.every((row: Row) => row.plType === null)).toBe(true);
  });
});
