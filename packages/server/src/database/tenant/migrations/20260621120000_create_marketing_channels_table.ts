// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('marketing_channels', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamps();
  });

exports.down = (knex) =>
  knex.schema.dropTableIfExists('marketing_channels');
