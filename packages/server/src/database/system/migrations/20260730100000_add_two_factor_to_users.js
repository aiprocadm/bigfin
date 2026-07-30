exports.up = (knex) =>
  knex.schema.table('users', (table) => {
    table.boolean('two_factor_enabled').notNullable().defaultTo(false);
    table.string('two_factor_secret', 512);
    table.text('two_factor_backup_codes');
    table.datetime('two_factor_enabled_at');
  });

exports.down = (knex) =>
  knex.schema.table('users', (table) => {
    table.dropColumn('two_factor_enabled');
    table.dropColumn('two_factor_secret');
    table.dropColumn('two_factor_backup_codes');
    table.dropColumn('two_factor_enabled_at');
  });
