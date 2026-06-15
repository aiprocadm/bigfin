// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('notification_preferences', (table) => {
    table.increments('id');
    table.string('event_type').notNullable().index();
    table.boolean('enabled').notNullable().defaultTo(false);
    table.text('channels').notNullable().defaultTo('["email"]');
    table.text('threshold').nullable();
    table.timestamps();
  });

exports.down = (knex) => knex.schema.dropTableIfExists('notification_preferences');
