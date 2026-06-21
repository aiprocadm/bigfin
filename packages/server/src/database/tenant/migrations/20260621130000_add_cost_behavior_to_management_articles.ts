// © 2026 Bigfin
// Аддитивная колонка для точки безубыточности (финмодель, фаза 4):
// помечает расходную статью как постоянную/переменную. NULL = не учтена.
exports.up = (knex) =>
  knex.schema.alterTable('management_articles', (table) => {
    table.string('cost_behavior').nullable(); // 'fixed' | 'variable' | null
  });

exports.down = (knex) =>
  knex.schema.alterTable('management_articles', (table) => {
    table.dropColumn('cost_behavior');
  });
