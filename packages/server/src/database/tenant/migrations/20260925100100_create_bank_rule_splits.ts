// © 2026 Bigfin
// FT-031 ТЗ-3 (D6). Строки правила «Разбить и заполнить»: какая доля суммы
// уходит в какую статью, направление и контрагента. Сумма долей = 100 %
// проверяется в службе, а не в базе: базе нечем сложить строки одного
// правила при вставке каждой.
//
// Удалили правило — удалились и его строки (CASCADE): без правила они
// ничего не значат.

const tableExists = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ?`,
    [table],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (await tableExists(knex, 'bank_rule_splits')) return;
  await knex.schema.createTable('bank_rule_splits', (table) => {
    table.increments('id');
    table.integer('rule_id').unsigned().notNullable();
    table.decimal('share_percent', 7, 4).notNullable();
    table.integer('article_id').unsigned().nullable();
    table.integer('project_id').unsigned().nullable();
    table.integer('contact_id').unsigned().nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table
      .foreign('rule_id', 'fk_bank_rule_splits_rule')
      .references('id')
      .inTable('bank_rules')
      .onDelete('CASCADE');
    table.index(['rule_id'], 'idx_rule_splits_rule');
  });
};

exports.down = async (knex) => {
  if (!(await tableExists(knex, 'bank_rule_splits'))) return;
  await knex.schema.dropTable('bank_rule_splits');
};
