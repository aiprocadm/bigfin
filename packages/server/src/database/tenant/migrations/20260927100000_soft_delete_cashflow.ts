// © 2026 Bigfin
// FT-042 ТЗ-3 (D8, D9). Корзина операций: удаление денежной операции и
// строки выписки больше не безвозвратно. Удалённая строка остаётся в базе с
// отметкой «когда, кем и почему», из отчётов уходит сразу (проводки
// снимаются), а восстановление возвращает её в тот же период.
//
// Колонки одинаковые в обеих таблицах. NULLABLE: пусто — «не удалена», то
// есть ровно как было.
//
// ПОЧЕМУ information_schema — см. `20260918100100_add_legal_entity_id_columns.ts`.

const SOFT_DELETE_TABLES = [
  { table: 'cashflow_transactions', index: 'idx_cft_deleted' },
  { table: 'uncategorized_cashflow_transactions', index: 'idx_uct_deleted' },
];

const softDeleteColumnExists = async (knex, table, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [table, column],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  for (const { table, index } of SOFT_DELETE_TABLES) {
    if (await softDeleteColumnExists(knex, table, 'deleted_at')) continue;
    await knex.schema.alterTable(table, (t) => {
      t.dateTime('deleted_at').nullable();
      t.integer('deleted_by').unsigned().nullable();
      t.string('delete_reason', 255).nullable();
      t.index(['deleted_at'], index);
    });
  }
};

exports.down = async (knex) => {
  for (const { table, index } of SOFT_DELETE_TABLES) {
    if (!(await softDeleteColumnExists(knex, table, 'deleted_at'))) continue;
    await knex.schema.alterTable(table, (t) => {
      t.dropIndex(['deleted_at'], index);
      t.dropColumn('deleted_at');
      t.dropColumn('deleted_by');
      t.dropColumn('delete_reason');
    });
  }
};
