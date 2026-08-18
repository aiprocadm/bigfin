exports.up = (knex) => {
  return knex.schema.table('accounts', (table) => {
    table.date('seeded_at').after('currency_code').nullable();
  });
};

// Откат был пустым — миграцию нельзя было отменить (М3 карты v15).
exports.down = (knex) => {
  return knex.schema.table('accounts', (table) => {
    table.dropColumn('seeded_at');
  });
};
