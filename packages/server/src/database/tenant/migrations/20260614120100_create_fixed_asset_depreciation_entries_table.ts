// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('fixed_asset_depreciation_entries', (table) => {
    table.increments('id');
    table
      .integer('fixed_asset_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('fixed_assets')
      .onDelete('CASCADE')
      .index();
    table.string('period', 7).notNullable().index();
    table.integer('seq_no').unsigned().notNullable();
    table.decimal('amount', 15, 5).notNullable();
    table.string('status').notNullable().defaultTo('planned').index();
    table.date('posted_at').nullable();
    table.timestamps();
  });

exports.down = (knex) =>
  knex.schema.dropTableIfExists('fixed_asset_depreciation_entries');
