// © 2026 Bigfin
// FT-013 ТЗ-3. «Месяц начисления» у денежной операции: аренду за декабрь
// заплатили 5 января — в отчёте о прибыли она нужна в декабре, а в отчёте
// о деньгах остаётся на дате платежа.
//
// ДВЕ ТАБЛИЦЫ. У документа (`cashflow_transactions`) — потому что проводки
// при правке и перепроводке пересобираются из документа, и выбор человека
// обязан это пережить. У проводок (`accounts_transactions`) — потому что
// отчёты читают проводки, и искать месяц через соединение с документом на
// каждом отчёте было бы и медленно, и не у всех документов.
//
// Формат 'YYYY-MM' (7 знаков). NULLABLE: пусто — «месяц платежа», то есть
// ровно как было до этой колонки.
//
// ПОЧЕМУ information_schema, А НЕ hasColumn — см.
// `20260918100100_add_legal_entity_id_columns.ts`: имена отображаются в
// верхний регистр, и hasColumn на MySQL под Linux отвечает «нет».

const accrualColumnExists = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = 'accrual_period'`,
    [table],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  // Повторный прогон после падения на середине не должен спотыкаться.
  if (!(await accrualColumnExists(knex, 'cashflow_transactions'))) {
    await knex.schema.alterTable('cashflow_transactions', (table) => {
      table.string('accrual_period', 7).nullable();
    });
  }
  if (!(await accrualColumnExists(knex, 'accounts_transactions'))) {
    await knex.schema.alterTable('accounts_transactions', (table) => {
      table.string('accrual_period', 7).nullable();
      // Отчёт о прибыли отбирает проводки по месяцу начисления.
      table.index(['accrual_period'], 'idx_accounts_transactions_accrual_period');
    });
  }
};

exports.down = async (knex) => {
  if (await accrualColumnExists(knex, 'accounts_transactions')) {
    await knex.schema.alterTable('accounts_transactions', (table) => {
      table.dropIndex(['accrual_period'], 'idx_accounts_transactions_accrual_period');
      table.dropColumn('accrual_period');
    });
  }
  if (await accrualColumnExists(knex, 'cashflow_transactions')) {
    await knex.schema.alterTable('cashflow_transactions', (table) => {
      table.dropColumn('accrual_period');
    });
  }
};
