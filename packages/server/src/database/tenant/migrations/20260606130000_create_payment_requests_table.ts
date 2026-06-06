// © 2026 Bigfin
exports.up = (knex) => {
  return knex.schema.createTable('payment_requests', (table) => {
    table.increments('id');

    table.decimal('amount', 13, 3).notNullable();
    table.string('currency_code', 3).notNullable();

    table
      .integer('article_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('management_articles');
    table
      .integer('contact_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('contacts');
    table
      .integer('account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts');
    table.integer('branch_id').unsigned().nullable();

    table.date('due_date').notNullable().index();
    table.string('description').nullable();

    table.string('status').notNullable().defaultTo('pending').index(); // pending|approved|rejected|cancelled
    table.integer('created_by').unsigned().notNullable().index();
    table.integer('approved_by').unsigned().nullable();
    table.datetime('approved_at').nullable();
    table
      .integer('planned_operation_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('planned_operations');

    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('payment_requests');
