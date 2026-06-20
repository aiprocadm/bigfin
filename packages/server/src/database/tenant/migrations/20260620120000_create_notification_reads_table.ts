// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('notification_reads', (table) => {
    table.increments('id');
    table.integer('notification_id').unsigned().notNullable().index();
    table.integer('user_id').unsigned().notNullable().index();
    table.dateTime('read_at').notNullable();
    table.timestamps();
    table.unique(['notification_id', 'user_id']);
  });

exports.down = (knex) =>
  knex.schema.dropTableIfExists('notification_reads');
