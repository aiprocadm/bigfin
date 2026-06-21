// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('marketing_monthly', (table) => {
    table.increments('id');
    table.integer('channel_id').unsigned().notNullable().index();
    table.string('month').notNullable(); // 'YYYY-MM'
    table.decimal('spend', 13, 3).notNullable().defaultTo(0);
    table.integer('new_customers').notNullable().defaultTo(0);
    table.timestamps();
    table.unique(['channel_id', 'month']);
    table
      .foreign('channel_id')
      .references('id')
      .inTable('marketing_channels')
      .onDelete('CASCADE');
  });

exports.down = (knex) =>
  knex.schema.dropTableIfExists('marketing_monthly');
