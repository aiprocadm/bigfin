// © 2026 Bigfin
// FT-056 ТЗ-3 (D19). Привязка планового остатка бюджета: от факта
// предыдущего периода (как у конкурента) или от плана — траектория «если
// план сбудется». Домен значений — в коде.

const budgetPlanAnchorColumnExists = async (knex) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE() AND LOWER(table_name) = 'budgets' AND LOWER(column_name) = 'plan_anchor'`,
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (await budgetPlanAnchorColumnExists(knex)) return;
  await knex.schema.alterTable('budgets', (table) => {
    table.string('plan_anchor', 8).notNullable().defaultTo('fact');
  });
};

exports.down = async (knex) => {
  if (!(await budgetPlanAnchorColumnExists(knex))) return;
  await knex.schema.alterTable('budgets', (table) => {
    table.dropColumn('plan_anchor');
  });
};
