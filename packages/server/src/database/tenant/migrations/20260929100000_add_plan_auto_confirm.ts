// © 2026 Bigfin
// FT-052 ТЗ-3. Автоподтверждение плана фактом.
//
// В перечне изменений базы ТЗ-3 этих колонок нет, но без них задачу не
// сделать: галочки «подтверждать автоматически», «точное совпадение сумм»,
// «с любым контрагентом» принадлежат плану, а ссылка на операцию, которая
// его закрыла, — единственный способ показать «план исполнен вот этим» и не
// закрыть один план двумя фактами. Ссылка мягкая (без внешнего ключа):
// удалили операцию — план не должен ломаться.

const planAutoConfirmColumnExists = async (knex, table, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ? AND LOWER(column_name) = ?`,
    [table, column],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (await planAutoConfirmColumnExists(knex, 'planned_operations', 'auto_confirm')) return;
  await knex.schema.alterTable('planned_operations', (table) => {
    table.boolean('auto_confirm').notNullable().defaultTo(false);
    table.boolean('match_exact_amount').notNullable().defaultTo(false);
    table.boolean('match_any_contact').notNullable().defaultTo(false);
    table.integer('matched_transaction_id').unsigned().nullable();
    table.index(['matched_transaction_id'], 'idx_po_matched_txn');
  });
};

exports.down = async (knex) => {
  if (!(await planAutoConfirmColumnExists(knex, 'planned_operations', 'auto_confirm'))) return;
  await knex.schema.alterTable('planned_operations', (table) => {
    table.dropIndex(['matched_transaction_id'], 'idx_po_matched_txn');
    table.dropColumn('matched_transaction_id');
    table.dropColumn('match_any_contact');
    table.dropColumn('match_exact_amount');
    table.dropColumn('auto_confirm');
  });
};
