exports.up = (knex) => {
  return knex.schema.createTable('budgets', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('type').notNullable().index(); // 'bdir' | 'bdds'
    table.integer('fiscal_year').notNullable().index();
    table.string('period_granularity').notNullable().defaultTo('month');
    table.string('active_scenario').notNullable().defaultTo('realistic');
    table.integer('branch_id').unsigned().nullable();
    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('budgets');
