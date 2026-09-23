// © 2026 Bigfin
// FT-030 ТЗ-3. Направление у денежной операции.
//
// ЭТОЙ КОЛОНКИ НЕТ В СПИСКЕ ИЗМЕНЕНИЙ БАЗЫ ТЗ-3, но без неё действие
// правила «направление» не работает: у денежной операции направления не было
// вовсе, а отчёты читают направление у ПРОВОДОК. Проводки при правке и
// перепроводке пересобираются из документа — значит, выбор обязан жить у
// документа, иначе первая же перепроводка его сотрёт. Ровно так же устроен
// месяц начисления (`20260924100000_add_accrual_period.ts`).
//
// NULLABLE: пусто — «без направления», то есть ровно как было.

const columnExists = async (knex) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'cashflow_transactions'
        AND LOWER(column_name) = 'project_id'`,
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (await columnExists(knex)) return;
  await knex.schema.alterTable('cashflow_transactions', (table) => {
    table.integer('project_id').unsigned().nullable();
    table.index(['project_id'], 'idx_cft_project');
  });
};

exports.down = async (knex) => {
  if (!(await columnExists(knex))) return;
  await knex.schema.alterTable('cashflow_transactions', (table) => {
    table.dropIndex(['project_id'], 'idx_cft_project');
    table.dropColumn('project_id');
  });
};
