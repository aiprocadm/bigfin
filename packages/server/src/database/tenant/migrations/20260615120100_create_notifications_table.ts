// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('notifications', (table) => {
    table.increments('id');
    table.string('event_type').notNullable().index();
    table.string('title').notNullable();
    table.text('body').notNullable();
    table.string('dedup_key').notNullable().index();
    table.text('payload').nullable();
    table.dateTime('fired_at').notNullable().index();
    table.dateTime('read_at').nullable();
    table.integer('user_id').unsigned().nullable();
    table.text('channels_sent').nullable();
    table.timestamps();
  });

exports.down = (knex) => knex.schema.dropTableIfExists('notifications');
