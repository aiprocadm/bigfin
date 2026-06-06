// © 2026 Bigfin
exports.up = async (knex) => {
  await knex.schema.createTable('debt_repayment_plans', (table) => {
    table.increments('id');

    table.string('side').notNullable().index(); // receivable | payable
    table
      .integer('contact_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('contacts')
      .index();
    table.string('source_type').nullable(); // invoice | bill | null
    table.integer('source_id').unsigned().nullable();

    table.decimal('total_amount', 13, 3).notNullable();
    table.string('currency_code', 3).notNullable();
    table.string('status').notNullable().defaultTo('active').index(); // active|completed|cancelled
    table.string('description').nullable();

    table.timestamps();
  });

  await knex.schema.createTable('debt_repayment_installments', (table) => {
    table.increments('id');
    table
      .integer('plan_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('debt_repayment_plans')
      .onDelete('CASCADE')
      .index();

    table.date('due_date').notNullable().index();
    table.decimal('amount', 13, 3).notNullable();
    table.string('status').notNullable().defaultTo('planned').index(); // planned|paid
    table.datetime('paid_at').nullable();
    table.string('note').nullable();
    table.integer('sort_order').unsigned().notNullable().defaultTo(0);

    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('debt_repayment_installments');
  await knex.schema.dropTableIfExists('debt_repayment_plans');
};
