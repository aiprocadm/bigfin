// © 2026 Bigfin
exports.up = (knex) => {
  return knex.schema.createTable('deal_stages', (table) => {
    table.increments('id');
    table
      .integer('deal_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .index();
    table.string('name').notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.decimal('planned_revenue', 13, 3).notNullable().defaultTo(0);
    table.decimal('planned_cost', 13, 3).notNullable().defaultTo(0);
    table.string('status').notNullable().defaultTo('open'); // open|closed
    table.date('closed_date').nullable();
    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('deal_stages');
