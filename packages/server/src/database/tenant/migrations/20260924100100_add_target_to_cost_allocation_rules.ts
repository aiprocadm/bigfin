// © 2026 Bigfin
// FT-011 ТЗ-3. Правило распределения косвенных расходов умело делить пул
// только между СДЕЛКАМИ. Теперь цель бывает двух видов: сделки или
// направления (`target_type`), а список целей — `target_ids`.
//
// СТАРОЕ ПОЛЕ НЕ УДАЛЯЕМ. `target_deal_ids` остаётся на месте: удаление
// колонок — только с решения владельца. Его значения копируются в
// `target_ids`, и код читает новое поле, а старое — как запасное.
//
// ПОЧЕМУ information_schema — см. `20260918100100_add_legal_entity_id_columns.ts`.

const ruleColumnExists = async (knex, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'cost_allocation_rules'
        AND LOWER(column_name) = ?`,
    [column],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (!(await ruleColumnExists(knex, 'target_type'))) {
    await knex.schema.alterTable('cost_allocation_rules', (table) => {
      // Прежние правила — про сделки: так они и работали.
      table.string('target_type', 16).notNullable().defaultTo('deal');
    });
  }
  if (!(await ruleColumnExists(knex, 'target_ids'))) {
    await knex.schema.alterTable('cost_allocation_rules', (table) => {
      table.json('target_ids').nullable();
    });
  }
  // Копирование — построителем запросов, а НЕ сырым SQL: имена таблиц и
  // колонок продукт переводит в верхний регистр, а сырой запрос этого
  // перевода не получает — на MySQL под Linux «cost_allocation_rules» не
  // находится (так и упал первый прогон на стенде). Вне проверки колонки и
  // только в пустые — чтобы повторный прогон после падения докопировал.
  await knex('cost_allocation_rules')
    .whereNull('target_ids')
    .whereNotNull('target_deal_ids')
    .update({ target_ids: knex.ref('target_deal_ids') });
};

exports.down = async (knex) => {
  if (await ruleColumnExists(knex, 'target_ids')) {
    await knex.schema.alterTable('cost_allocation_rules', (table) => {
      table.dropColumn('target_ids');
    });
  }
  if (await ruleColumnExists(knex, 'target_type')) {
    await knex.schema.alterTable('cost_allocation_rules', (table) => {
      table.dropColumn('target_type');
    });
  }
};
