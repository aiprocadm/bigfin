// © 2026 Bigfin
// Колонки для импорта выписки 1С (фаза 1):
// - payee_inn (ИНН контрагента из выписки) и external_id (ключ для дедупликации) на uncategorized_cashflow_transactions
// - contact_id (ссылка на контрагента) на cashflow_transactions
exports.up = (knex) =>
  knex.schema
    .alterTable('uncategorized_cashflow_transactions', (table) => {
      table.string('payee_inn', 12).nullable();
      table.string('external_id').nullable().index();
    })
    .alterTable('cashflow_transactions', (table) => {
      table
        .integer('contact_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('contacts');
    });

exports.down = (knex) =>
  knex.schema
    .alterTable('cashflow_transactions', (table) => {
      table.dropColumn('contact_id');
    })
    .alterTable('uncategorized_cashflow_transactions', (table) => {
      table.dropColumn('payee_inn');
      table.dropColumn('external_id');
    });
