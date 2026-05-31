exports.up = (knex) => {
  return knex.schema.createTable('budget_lines', (table) => {
    table.increments('id');
    table
      .integer('budget_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('budgets')
      .onDelete('CASCADE');
    table
      .integer('article_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('management_articles');
    table.date('period').notNullable(); // first day of month
    table.string('scenario').notNullable().defaultTo('realistic');
    table.decimal('planned_amount', 13, 3).notNullable().defaultTo(0);
    table.timestamps();

    table.unique(['budget_id', 'article_id', 'period', 'scenario']);
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('budget_lines');
