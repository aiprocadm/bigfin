// © 2026 Bigfin
// FT-053 ТЗ-3 (D17, D18). Заявки на оплату: черновик, обоснование, ссылка на
// документ и НЕСКОЛЬКО плановых оплат внутри одной заявки (дата + сумма +
// счёт). Статус «черновик» — значение в коде (домен статусов), колонка та
// же. У оплаты — ссылка на плановую операцию, которую породило одобрение.

const paymentRequestsColumnExists = async (knex, table, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ? AND LOWER(column_name) = ?`,
    [table, column],
  );
  return Number(rows[0].count) > 0;
};

const paymentRequestsTableExists = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ?`,
    [table],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (!(await paymentRequestsColumnExists(knex, 'payment_requests', 'document_url'))) {
    await knex.schema.alterTable('payment_requests', (table) => {
      table.string('document_url', 1000).nullable();
      table.text('justification').nullable();
    });
  }
  if (!(await paymentRequestsTableExists(knex, 'payment_request_installments'))) {
    await knex.schema.createTable('payment_request_installments', (table) => {
      table.increments('id');
      table
        .integer('request_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_requests')
        .onDelete('CASCADE');
      table.date('due_date').notNullable();
      table.decimal('amount', 13, 3).notNullable();
      table.integer('account_id').unsigned().nullable();
      table.integer('planned_operation_id').unsigned().nullable();
      table.integer('sort_order').notNullable().defaultTo(0);
      table.index(['request_id'], 'idx_pri_req');
      table.index(['due_date'], 'idx_pri_due');
    });
  }
};

exports.down = async (knex) => {
  if (await paymentRequestsTableExists(knex, 'payment_request_installments')) {
    await knex.schema.dropTable('payment_request_installments');
  }
  if (await paymentRequestsColumnExists(knex, 'payment_requests', 'document_url')) {
    await knex.schema.alterTable('payment_requests', (table) => {
      table.dropColumn('justification');
      table.dropColumn('document_url');
    });
  }
};
