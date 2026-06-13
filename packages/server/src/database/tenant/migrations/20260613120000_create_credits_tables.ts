// © 2026 Bigfin
exports.up = async (knex) => {
  await knex.schema.createTable('credits', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('lender').nullable();
    table.decimal('principal_amount', 13, 3).notNullable();
    table.decimal('annual_interest_rate', 9, 4).notNullable().defaultTo(0);
    table.integer('term_months').unsigned().notNullable();
    table.date('start_date').notNullable().index();
    table.string('schedule_type').notNullable().defaultTo('annuity');
    table
      .integer('payment_account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .index();
    table
      .integer('liability_account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts')
      .index();
    table
      .integer('interest_expense_account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts')
      .index();
    table.string('status').notNullable().defaultTo('active');
    table.text('note').nullable();
    table.timestamps();
  });

  await knex.schema.createTable('credit_installments', (table) => {
    table.increments('id');
    table
      .integer('credit_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('credits')
      .index();
    table.integer('seq_no').unsigned().notNullable();
    table.date('due_date').notNullable().index();
    table.decimal('payment_amount', 13, 3).notNullable();
    table.decimal('principal_amount', 13, 3).notNullable();
    table.decimal('interest_amount', 13, 3).notNullable();
    table.decimal('remaining_balance', 13, 3).notNullable();
    table.string('status').notNullable().defaultTo('planned');
    table.date('paid_date').nullable();
    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('credit_installments');
  await knex.schema.dropTableIfExists('credits');
};
