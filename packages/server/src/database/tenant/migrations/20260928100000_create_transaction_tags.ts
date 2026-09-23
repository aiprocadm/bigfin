// © 2026 Bigfin
// FT-025 ТЗ-3 (D4). Метка операции.
//
// ТЗ кладёт метку колонкой в проводки (`accounts_transactions.tag`). Так
// делать нельзя: проводки документа не правятся, а СТИРАЮТСЯ И ПИШУТСЯ
// ЗАНОВО — при восстановлении из корзины, при разноске автоправилом, при
// правке документа. Метка в проводке молча пропадала бы при каждой такой
// перезаписи. Поэтому метка — свойство документа: одна строка на документ
// (вид + номер), проводки её не трогают. Отбор реестра по метке — через эту
// таблицу.

const transactionTagsTableExists = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ?`,
    [table],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (await transactionTagsTableExists(knex, 'transaction_tags')) return;
  await knex.schema.createTable('transaction_tags', (table) => {
    table.increments('id');
    table.string('reference_type', 64).notNullable();
    table.integer('reference_id').unsigned().notNullable();
    table.string('tag', 64).notNullable();
    table.timestamps();
    table.unique(['reference_type', 'reference_id'], 'uq_txn_tag_ref');
    table.index(['tag'], 'idx_txn_tag');
  });
};

exports.down = async (knex) => {
  if (!(await transactionTagsTableExists(knex, 'transaction_tags'))) return;
  await knex.schema.dropTable('transaction_tags');
};
