/**
 * Демо «в один щелчок» (Д1 карты v18): таблица `oneclick_demos` существовала
 * с 2024 года, но ею никто не пользовался — серверных ручек не было вовсе.
 * Добавляем ссылку на джоб постройки организации (по ней публичный поллинг
 * проверяет, что спрашивают именно про своё демо) и индекс на ключ, по
 * которому демо ищут при входе.
 *
 * Наличие колонки и индекса проверяем сами, сравнивая имена БЕЗ учёта
 * регистра: на тестовом стенде системная база лежит с именами таблиц в
 * верхнем регистре, и `knex.schema.hasColumn('oneclick_demos', …)` отвечает
 * «нет» для существующей колонки — миграция при повторном прогоне падала бы
 * на попытке добавить её второй раз.
 */
const TABLE = 'oneclick_demos';
const COLUMN = 'build_job_id';
const INDEX = 'oneclick_demos_key_index';

const hasColumnAnyCase = async (knex, table, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [table.toLowerCase(), column.toLowerCase()],
  );
  return Number(rows[0].count) > 0;
};

const hasIndexAnyCase = async (knex, table, index) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(index_name) = ?`,
    [table.toLowerCase(), index.toLowerCase()],
  );
  return Number(rows[0].count) > 0;
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  if (!(await hasColumnAnyCase(knex, TABLE, COLUMN))) {
    await knex.schema.alterTable(TABLE, (table) => {
      table.string(COLUMN).nullable();
    });
  }
  if (!(await hasIndexAnyCase(knex, TABLE, INDEX))) {
    await knex.schema.alterTable(TABLE, (table) => {
      table.index(['key'], INDEX);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  if (await hasIndexAnyCase(knex, TABLE, INDEX)) {
    await knex.schema.alterTable(TABLE, (table) => {
      table.dropIndex(['key'], INDEX);
    });
  }
  if (await hasColumnAnyCase(knex, TABLE, COLUMN)) {
    await knex.schema.alterTable(TABLE, (table) => {
      table.dropColumn(COLUMN);
    });
  }
};
