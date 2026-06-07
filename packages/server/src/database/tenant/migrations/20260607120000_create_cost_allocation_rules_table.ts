// © 2026 Bigfin
exports.up = (knex) => {
  return knex.schema.createTable('cost_allocation_rules', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table
      .integer('source_article_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('management_articles');
    table.string('allocation_key').notNullable().defaultTo('revenue'); // revenue|manual_share
    table.json('manual_shares').nullable(); // { "<dealId>": <weight> }
    table.json('target_deal_ids').nullable(); // null = all active deals
    table.date('valid_from').nullable();
    table.date('valid_to').nullable();
    table.boolean('is_active').notNullable().defaultTo(true).index();
    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('cost_allocation_rules');
