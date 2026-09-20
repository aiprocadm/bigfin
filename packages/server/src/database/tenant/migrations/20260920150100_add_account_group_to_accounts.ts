// © 2026 Bigfin
import { Knex } from 'knex';

/**
 * Ссылка счёта на пользовательскую группу (D4 ТЗ-2, FIN-017).
 *
 * КОЛОНКА NULLABLE, И ЭТО ГЛАВНОЕ. Все существующие счета остаются без
 * группы и попадают в «Нераспределённые»: накат ничего не меняет ни на
 * одном экране и ни в одном отчёте.
 *
 * `SET NULL` ВМЕСТО `CASCADE` — НАМЕРЕННО. Удаление группы НИКОГДА не должно
 * удалять счета. Человек, убирающий кучку «Депозиты», хочет убрать кучку, а
 * не депозиты; каскад унёс бы вместе со счётом всю его историю операций, и
 * восстановить её было бы нечем.
 */
const TABLE = 'accounts';
const COLUMN = 'account_group_id';

async function accountGroupHasTable(knex: Knex, table: string) {
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

async function accountGroupHasColumn(
  knex: Knex,
  table: string,
  column: string,
) {
  const result: any = await knex.raw(
    `SELECT COUNT(*) AS total
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [table.toLowerCase(), column.toLowerCase()],
  );
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;

  return Number(first?.total ?? first?.TOTAL ?? 0) > 0;
}

export async function up(knex: Knex): Promise<void> {
  if (!(await accountGroupHasTable(knex, TABLE))) return;
  if (await accountGroupHasColumn(knex, TABLE, COLUMN)) return;

  await knex.schema.alterTable(TABLE, (table) => {
    table.integer(COLUMN).unsigned().nullable().index();
  });

  // Внешний ключ ставится отдельно: на базе, где таблицы групп нет (откат
  // соседней миграции уже прошёл), ссылку вешать не на что, и падать
  // из-за этого вся миграция не должна.
  if (await accountGroupHasTable(knex, 'account_groups')) {
    await knex.schema.alterTable(TABLE, (table) => {
      table
        .foreign(COLUMN)
        .references('id')
        .inTable('account_groups')
        .onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (!(await accountGroupHasTable(knex, TABLE))) return;
  if (!(await accountGroupHasColumn(knex, TABLE, COLUMN))) return;

  await knex.schema.alterTable(TABLE, (table) => {
    // Снять ссылку раньше колонки: MySQL не даст удалить колонку, на
    // которой висит внешний ключ.
    try {
      table.dropForeign([COLUMN]);
    } catch {
      // Ссылки могло и не быть — тогда снимать нечего.
    }
    table.dropColumn(COLUMN);
  });
}
