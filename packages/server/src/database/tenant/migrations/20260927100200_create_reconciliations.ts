// © 2026 Bigfin
// FT-040, FT-041 ТЗ-3 (D12, D13). Сверка счёта с банком: одна сверка —
// счёт, период, остатки «у нас» и «в банке», расхождение и два списка:
// «есть в банке, нет у нас» и «есть у нас, нет в банке». История хранится
// 180 дней, затем чистится.
//
// Строки сверки удаляются вместе со сверкой (CASCADE): без неё они ничего
// не значат.

const reconciliationTableExists = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ?`,
    [table],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (!(await reconciliationTableExists(knex, 'reconciliations'))) {
    await knex.schema.createTable('reconciliations', (table) => {
      table.bigIncrements('id');
      table.integer('account_id').unsigned().notNullable();
      table.date('from_date').notNullable();
      table.date('to_date').notNullable();
      // running — идёт, done — готово, failed — не удалось.
      table.string('status', 16).notNullable().defaultTo('running');
      // integration — по банку, file — по загруженной выписке (FT-041).
      table.string('source', 16).notNullable().defaultTo('integration');
      table.decimal('bank_balance', 15, 5).nullable();
      table.decimal('our_balance', 15, 5).nullable();
      table.decimal('diff', 15, 5).nullable();
      table.integer('missing_here').unsigned().notNullable().defaultTo(0);
      table.integer('missing_bank').unsigned().notNullable().defaultTo(0);
      table.string('error', 255).nullable();
      table.dateTime('started_at').notNullable();
      table.dateTime('finished_at').nullable();
      table.integer('created_by').unsigned().nullable();
      table
        .foreign('account_id', 'fk_reconciliations_account')
        .references('id')
        .inTable('accounts')
        .onDelete('CASCADE');
      table.index(['account_id', 'from_date'], 'idx_rec_acc_date');
      table.index(['started_at'], 'idx_rec_started');
    });
  }
  if (!(await reconciliationTableExists(knex, 'reconciliation_items'))) {
    await knex.schema.createTable('reconciliation_items', (table) => {
      table.bigIncrements('id');
      table.bigInteger('reconciliation_id').unsigned().notNullable();
      // missing_here — есть в банке, нет у нас; missing_bank — наоборот.
      table.string('side', 16).notNullable();
      table.string('external_id', 255).nullable();
      table.date('date').notNullable();
      table.decimal('amount', 15, 5).notNullable();
      table.string('payee', 255).nullable();
      table.text('description').nullable();
      // Наша строка выписки (для «нет в банке») или удалённая, найденная в банке.
      table.bigInteger('transaction_id').unsigned().nullable();
      // Чья это строка: bank_line — строка выписки, cashflow — денежная
      // операция без неё. Нужно, чтобы «Удалить» знало, что класть в корзину.
      table.string('transaction_kind', 16).nullable();
      // Строка «в банке» совпала с удалённой вручную: когда и кем удалена.
      table.dateTime('deleted_at').nullable();
      table.integer('deleted_by').unsigned().nullable();
      // added — добавлена, deleted — удалена, ignored — оставлена как есть.
      table.string('resolved_as', 16).nullable();
      table.dateTime('resolved_at').nullable();
      table
        .foreign('reconciliation_id', 'fk_rec_items_rec')
        .references('id')
        .inTable('reconciliations')
        .onDelete('CASCADE');
      table.index(['reconciliation_id'], 'idx_rec_items_rec');
    });
  }
};

exports.down = async (knex) => {
  if (await reconciliationTableExists(knex, 'reconciliation_items')) {
    await knex.schema.dropTable('reconciliation_items');
  }
  if (await reconciliationTableExists(knex, 'reconciliations')) {
    await knex.schema.dropTable('reconciliations');
  }
};
