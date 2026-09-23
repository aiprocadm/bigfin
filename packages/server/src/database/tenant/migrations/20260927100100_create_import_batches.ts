// © 2026 Bigfin
// FT-043 ТЗ-3 (D10, D11). Пакет импорта: каждый импорт выписки (файл, банк
// по API) получает номер, а его строки — ссылку на пакет. По номеру пакет
// можно откатить целиком — все строки уходят в корзину одной транзакцией.
//
// Старые строки без пакета остаются как есть (NULL): откатить их нечем, но
// и ломать нечего.

const importTableExists = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ?`,
    [table],
  );
  return Number(rows[0].count) > 0;
};

const importBatchColumnExists = async (knex) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'uncategorized_cashflow_transactions'
        AND LOWER(column_name) = 'import_batch_id'`,
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (!(await importTableExists(knex, 'import_batches'))) {
    await knex.schema.createTable('import_batches', (table) => {
      table.bigIncrements('id');
      // file — выписка файлом (1С, таблица), bank — банк по API, api — прочее.
      table.string('source', 24).notNullable();
      table.integer('account_id').unsigned().notNullable();
      table.string('file_name', 255).nullable();
      table.integer('rows_count').unsigned().notNullable().defaultTo(0);
      table.integer('created_by').unsigned().nullable();
      table.dateTime('created_at').notNullable();
      table.dateTime('rolled_back_at').nullable();
      table
        .foreign('account_id', 'fk_import_batches_account')
        .references('id')
        .inTable('accounts')
        .onDelete('CASCADE');
      table.index(['account_id'], 'idx_import_batch_acc');
      table.index(['created_at'], 'idx_import_batch_created');
    });
  }
  if (!(await importBatchColumnExists(knex))) {
    await knex.schema.alterTable('uncategorized_cashflow_transactions', (table) => {
      table.bigInteger('import_batch_id').unsigned().nullable();
      table
        .foreign('import_batch_id', 'fk_uct_import_batch')
        .references('id')
        .inTable('import_batches')
        .onDelete('SET NULL');
      table.index(['import_batch_id'], 'idx_uct_batch');
    });
  }
};

exports.down = async (knex) => {
  if (await importBatchColumnExists(knex)) {
    await knex.schema.alterTable('uncategorized_cashflow_transactions', (table) => {
      table.dropForeign(['import_batch_id'], 'fk_uct_import_batch');
      table.dropIndex(['import_batch_id'], 'idx_uct_batch');
      table.dropColumn('import_batch_id');
    });
  }
  if (await importTableExists(knex, 'import_batches')) {
    await knex.schema.dropTable('import_batches');
  }
};
