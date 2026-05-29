exports.up = (knex) => {
  return knex.schema.createTable('management_articles', (table) => {
    table.increments('id');

    table.string('name').notNullable().index();
    table
      .integer('parent_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('management_articles');
    table.string('kind').notNullable().index(); // 'income' | 'expense'
    table.string('cashflow_section').nullable(); // 'operating' | 'investing' | 'financing' | null
    table.integer('sort_order').unsigned().defaultTo(0);
    table.boolean('active').defaultTo(true).index();

    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('management_articles');
