exports.up = (knex) => {
  return knex.schema.createTable('management_article_accounts', (table) => {
    table.increments('id');

    table
      .integer('article_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('management_articles')
      .onDelete('CASCADE');
    table
      .integer('account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .onDelete('CASCADE');

    table.timestamps();

    // v1: один счёт входит ровно в одну статью — исключает двойной счёт в свёртке.
    table.unique(['account_id']);
  });
};

exports.down = (knex) =>
  knex.schema.dropTableIfExists('management_article_accounts');
