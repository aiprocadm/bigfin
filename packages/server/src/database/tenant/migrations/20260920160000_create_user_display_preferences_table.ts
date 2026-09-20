// © 2026 Bigfin
import { Knex } from 'knex';

/**
 * Личные настройки отображения (D3 ТЗ-2, FIN-026).
 *
 * ПОЧЕМУ В СХЕМЕ ОРГАНИЗАЦИИ, А НЕ В ОБЩЕЙ. Настройка относится к человеку
 * В КОНТЕКСТЕ организации: бухгалтер, ведущий три компании, в одной хочет
 * видеть копейки, в другой — нет, и это не противоречие, а разная работа.
 *
 * ПОЧЕМУ «КЛЮЧ — ЗНАЧЕНИЕ», А НЕ КОЛОНКА НА НАСТРОЙКУ. Набор настроек будет
 * расти: ярусы прибыли, колонки реестра, копейки, показ прошлых разрывов.
 * Миграция на каждую галочку — плохой обмен: код усложняется, а пользы ноль.
 */
const TABLE = 'user_display_preferences';

async function displayPrefsHasTable(knex: Knex, table: string) {
  const result: any = await knex.raw(
    `SELECT COUNT(*) AS total
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?`,
    [table.toLowerCase()],
  );
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;

  return Number(first?.total ?? first?.TOTAL ?? 0) > 0;
}

export async function up(knex: Knex): Promise<void> {
  if (await displayPrefsHasTable(knex, TABLE)) return;

  await knex.schema.createTable(TABLE, (table) => {
    table.increments('id');
    table.integer('user_id').unsigned().notNullable().index();
    table.string('key', 64).notNullable();
    table.json('value').notNullable();
    table.timestamps();

    // Одна настройка на человека: пара ключей с одним именем означала бы,
    // что продукт не знает, какую из них слушать.
    table.unique(['user_id', 'key']);
  });
}

export async function down(knex: Knex): Promise<void> {
  if (!(await displayPrefsHasTable(knex, TABLE))) return;

  await knex.schema.dropTableIfExists(TABLE);
}
