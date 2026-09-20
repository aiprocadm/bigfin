/**
 * Отрасль демо-организации (FIN-027 ТЗ-2).
 *
 * ЗАЧЕМ КОЛОНКА, А НЕ ПЕРЕДАЧА ЧЕРЕЗ ДЖОБ. Организация строится очередью, а
 * данными наполняется ПОСЛЕ постройки — из подписчика на событие «организация
 * построена». Подписчик получает только номер тенанта: отрасль ему взять
 * неоткуда, кроме как из записи о демо.
 *
 * ПОЧЕМУ В СИСТЕМНОЙ СХЕМЕ. `oneclick_demos` — таблица, общая для всех
 * организаций: она связывает ключ входа с тенантом. Данные одной организации
 * живут в тенантной схеме, а это не они.
 *
 * Наличие колонки проверяем сами, сравнивая имена БЕЗ учёта регистра: на
 * тестовом стенде системная база лежит с именами таблиц в верхнем регистре, и
 * `knex.schema.hasColumn` отвечает «нет» для существующей колонки — при
 * повторном прогоне миграция падала бы на попытке добавить её второй раз.
 */
const TABLE = 'oneclick_demos';
const COLUMN = 'industry';

/** Отрасль по умолчанию — самый частый случай российского малого дела. */
const DEFAULT_INDUSTRY = 'services';

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

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  if (await hasColumnAnyCase(knex, TABLE, COLUMN)) return;

  await knex.schema.alterTable(TABLE, (table) => {
    // Значение по умолчанию, а не `null`: демо, созданные до этой миграции,
    // наполнены набором услуг — пусть запись говорит правду о себе.
    table.string(COLUMN, 32).notNullable().defaultTo(DEFAULT_INDUSTRY);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  if (!(await hasColumnAnyCase(knex, TABLE, COLUMN))) return;

  await knex.schema.alterTable(TABLE, (table) => {
    table.dropColumn(COLUMN);
  });
};
