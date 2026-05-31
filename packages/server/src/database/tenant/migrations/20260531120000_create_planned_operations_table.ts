exports.up = (knex) => {
  return knex.schema.createTable('planned_operations', (table) => {
    table.increments('id');

    table.string('direction').notNullable().index(); // 'inflow' | 'outflow'
    table.decimal('amount', 13, 3).notNullable();
    table.string('currency_code', 3).notNullable();
    table.date('planned_date').notNullable().index();

    table
      .integer('article_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('management_articles');
    table
      .integer('account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts');
    table.integer('branch_id').unsigned().nullable();
    table.integer('project_id').unsigned().nullable();
    table
      .integer('contact_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('contacts');

    table.string('status').notNullable().defaultTo('planned').index(); // planned|confirmed|done|cancelled
    table.string('source_type').nullable();
    table.integer('source_id').unsigned().nullable();
    table.jsonb('recurrence').nullable();
    table.string('description').nullable();

    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('planned_operations');
