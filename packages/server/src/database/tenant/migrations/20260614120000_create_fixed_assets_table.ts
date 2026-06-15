// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('fixed_assets', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('category').nullable();
    table.decimal('cost', 15, 5).notNullable();
    table.decimal('salvage_value', 15, 5).notNullable().defaultTo(0);
    table.integer('service_life_months').unsigned().notNullable();
    table.date('commissioned_at').notNullable().index();
    table
      .integer('asset_account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .index();
    table
      .decimal('accumulated_depreciation', 15, 5)
      .notNullable()
      .defaultTo(0);
    table.string('status').notNullable().defaultTo('active').index();
    table.date('disposed_at').nullable();
    table.string('disposal_type').nullable();
    table.integer('disposal_account_id').unsigned().nullable();
    table.decimal('disposal_proceeds', 15, 5).nullable();
    table.text('note').nullable();
    table.timestamps();
  });

exports.down = (knex) => knex.schema.dropTableIfExists('fixed_assets');
