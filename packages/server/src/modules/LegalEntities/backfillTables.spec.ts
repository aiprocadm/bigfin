// © 2026 Bigfin
import { LEGAL_ENTITY_TABLES } from './constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const migration = require('../../database/tenant/migrations/20260918100100_add_legal_entity_id_columns');

/**
 * Этап 6 ТЗ. Список таблиц живёт в двух местах: миграция добавляет колонку,
 * заполнение её проставляет. Они ОБЯЗАНЫ совпадать.
 *
 * Расхождение не падает и ничего не ломает вслух. Таблица, попавшая только в
 * миграцию, получит пустую колонку, которую никто не заполнит: разрез по
 * юрлицу в ней промолчит — ровно как при опечатке в имени. Таблица, попавшая
 * только в заполнение, уронит задачу на несуществующей колонке.
 *
 * Поэтому проверка сравнивает списки, а не доверяет тому, что их правили
 * вместе.
 */
describe('список таблиц с юрлицом', () => {
  it('миграция и заполнение перечисляют одни и те же таблицы', () => {
    expect([...LEGAL_ENTITY_TABLES].sort()).toEqual(
      [...migration.TABLES].sort(),
    );
  });

  it('список не пустой', () => {
    // Иначе проверка выше стала бы пустой и зелёной.
    expect(LEGAL_ENTITY_TABLES.length).toBeGreaterThanOrEqual(13);
  });

  it('в списке нет повторов', () => {
    expect(new Set(LEGAL_ENTITY_TABLES).size).toBe(LEGAL_ENTITY_TABLES.length);
  });
});
