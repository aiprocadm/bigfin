// © 2026 Bigfin
import { Knex } from 'knex';

/**
 * Пользовательские группы денежных счетов (D4 ТЗ-2, FIN-017).
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ТАБЛИЦА, А НЕ `parent_account_id`. У счёта уже есть
 * иерархия — план счетов. Это БУХГАЛТЕРСКОЕ устройство: «расчётные счета»
 * внутри «денежных средств». Пользовательская группировка — другое
 * измерение: «операционные», «депозиты», «личные». Смешай их — и человек,
 * перетащив счёт в свою кучку, сломает план счетов и отчёты вместе с ним.
 * Ровно этот запрет прежнее ТЗ уже вводило для юрлиц и отделений.
 *
 * ГРУППА ПРИНАДЛЕЖИТ ОРГАНИЗАЦИИ, А НЕ ЮРЛИЦУ: счета разных юрлиц могут
 * лежать в одной кучке — так их и держат в голове.
 */
const TABLE = 'account_groups';

async function accountGroupsHasTable(knex: Knex, table: string) {
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
  if (await accountGroupsHasTable(knex, TABLE)) return;

  await knex.schema.createTable(TABLE, (table) => {
    table.increments('id');
    table.string('name', 60).notNullable().unique();
    table.integer('sort_order').unsigned().defaultTo(0).index();
    table.boolean('active').defaultTo(true);
    table.timestamps();
  });
}

export async function down(knex: Knex): Promise<void> {
  if (!(await accountGroupsHasTable(knex, TABLE))) return;

  await knex.schema.dropTableIfExists(TABLE);
}
