import knex from 'knex';
import { applyKeywordSearch } from './keywordSearch';

/**
 * Р1 карты v43. Разделы, в которых нельзя найти.
 *
 * Девять разделов, добавленных позже классических, не ищутся никак: у их
 * списков нет ни поля поиска на сервере, ни своего поля на экране. Поиск в
 * шапке — единственный путь, и он для них молчит.
 *
 * У этих списков нет общей машинерии `DynamicListing` — они написаны
 * простыми запросами. Общий помощник даёт им одинаковый поиск, чтобы
 * следующий раздел стоил одну строку, а не свою выдумку.
 */
const sqlFor = (columns: string[], keyword?: string): string => {
  const builder = knex({ client: 'mysql2' }).queryBuilder().from('projects');
  applyKeywordSearch(builder, columns, keyword);

  return builder.toString();
};

describe('поиск по ключевому слову в списке раздела', () => {
  it('ищет по одной колонке', () => {
    expect(sqlFor(['name'], 'Ромашка')).toContain("`name` like '%Ромашка%'");
  });

  it('несколько колонок соединяются через «или»', () => {
    const sql = sqlFor(['name', 'description'], 'ремонт');

    expect(sql).toContain("`name` like '%ремонт%'");
    expect(sql).toContain('or');
    expect(sql).toContain("`description` like '%ремонт%'");
  });

  it('условие поиска обособлено скобками', () => {
    // Иначе «или» из поиска склеится с фильтром по статусу, и раздел
    // покажет чужие записи: (статус=X И имя) ИЛИ описание.
    expect(sqlFor(['name', 'description'], 'ремонт')).toMatch(/\(.*or.*\)/);
  });

  it('пустой запрос ничего не фильтрует', () => {
    expect(sqlFor(['name'], '')).not.toContain('like');
    expect(sqlFor(['name'], undefined)).not.toContain('like');
    expect(sqlFor(['name'], '   ')).not.toContain('like');
  });

  it('знаки подстановки в запросе ищутся как обычные буквы', () => {
    // Иначе «100%» превратится в «найди всё», а «_» — в «любой символ».
    //
    // В готовом SQL слэш виден удвоенным: `'%100\\%%'`. Так и должно быть —
    // внутри строкового литерала MySQL `\\` означает один обратный слэш,
    // и до LIKE доходит `100\%`, то есть экранированный процент.
    expect(sqlFor(['name'], '100%')).toContain("'%100\\\\%%'");
    expect(sqlFor(['name'], 'а_б')).toContain("'%а\\\\_б%'");
  });
});
