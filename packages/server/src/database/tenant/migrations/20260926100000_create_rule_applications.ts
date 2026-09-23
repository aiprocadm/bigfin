// © 2026 Bigfin
// FT-036 ТЗ-3 (D7). След применения автоправил: какое правило, когда и что
// именно поставило денежной операции. По нему реестр ставит бейдж «А», а
// карточка операции показывает историю применений.
//
// Ссылки МЯГКИЕ (без внешних ключей), как в ТЗ: удалили правило или
// операцию — след остаётся и честно говорит «правило удалено». История не
// должна пропадать вместе с тем, о чём она рассказывает.
//
// `changes` — JSON с изменёнными полями (статья, направление, контрагент,
// части, сделка/этап); текстом, потому что читается целиком и только
// экраном.

const ruleApplicationsTableExists = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ?`,
    [table],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (await ruleApplicationsTableExists(knex, 'transaction_rule_applications')) return;
  await knex.schema.createTable('transaction_rule_applications', (table) => {
    table.bigIncrements('id');
    table.bigInteger('transaction_id').unsigned().notNullable();
    table.integer('rule_id').unsigned().notNullable();
    table.dateTime('applied_at').notNullable();
    table.text('changes').nullable();
    table.index(['transaction_id'], 'idx_tra_txn');
    table.index(['rule_id'], 'idx_tra_rule');
    table.index(['applied_at'], 'idx_tra_applied');
  });
};

exports.down = async (knex) => {
  if (!(await ruleApplicationsTableExists(knex, 'transaction_rule_applications'))) return;
  await knex.schema.dropTable('transaction_rule_applications');
};
