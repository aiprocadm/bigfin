// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('dividend_payouts', (table) => {
    table.increments('id');
    table.date('date').notNullable().index();
    table.decimal('amount', 13, 3).notNullable();
    table
      .integer('payment_account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .index();
    table
      .integer('equity_account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .index();
    table.text('note').nullable();
    table.timestamps();
  });

exports.down = (knex) => knex.schema.dropTableIfExists('dividend_payouts');
