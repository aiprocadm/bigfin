exports.up = (knex) => {
  return knex.schema.table('expense_transaction_categories', (table) => {
    table.integer('projectId').unsigned().references('id').inTable('projects');
  });
};

// Откат был пустым — миграцию нельзя было отменить (М3 карты v15).
// Сначала снимаем внешний ключ: MySQL не даст удалить колонку под ним.
exports.down = async (knex) => {
  await knex.schema.table('expense_transaction_categories', (table) => {
    table.dropForeign(['projectId']);
  });
  await knex.schema.table('expense_transaction_categories', (table) => {
    table.dropColumn('projectId');
  });
};
