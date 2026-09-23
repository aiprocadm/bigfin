// © 2026 Bigfin
// FT-030…FT-033 ТЗ-3 (D5). Автоправила банка умели одно — подсказать статью.
// Теперь у правила есть ТИП: «заполнить поля» (assign), «разбить» (split),
// «преобразовать в перевод» (transfer) и «привязать к сделке» (deal, этап 35).
//
// Колонки:
// - `rule_type` — тип; прежние правила — «заполнить поля», так они и работали;
// - `paused_at` — пауза (FT-035, этап 35): правило есть, но не срабатывает;
// - `transfer_to_account_id` — счёт-получатель перевода;
// - `assign_deal_id`, `assign_deal_stage_id` — сделка и этап (этап 35);
// - `assign_project_id` — направление;
// - `assign_contact_id` — контрагент. ЕГО НЕТ В СПИСКЕ D5, но действие
//   «контрагент» из FT-030 без него не работает: `assign_payee` — строка
//   с именем, а операции нужен сам контрагент;
// - `assign_tag` — метка (у проводок она появится в этапе 37, D4).
//
// Внешние ключи с обнулением при удалении: удалили счёт или сделку — правило
// остаётся, поле пустеет. Имена ключей заданы явно, чтобы откат снимал ровно
// их: имена, которые придумывает построитель, при переводе имён в верхний
// регистр предсказать нельзя.
//
// ПОЧЕМУ information_schema, А НЕ hasColumn — см.
// `20260918100100_add_legal_entity_id_columns.ts`.

const bankRuleColumnExists = async (knex, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'bank_rules'
        AND LOWER(column_name) = ?`,
    [column],
  );
  return Number(rows[0].count) > 0;
};

/** Колонка, её тип и, если есть, внешний ключ. */
const COLUMNS = [
  { name: 'rule_type', add: (t) => t.string('rule_type', 24).notNullable().defaultTo('assign').index('idx_rules_type') },
  { name: 'paused_at', add: (t) => t.dateTime('paused_at').nullable() },
  { name: 'transfer_to_account_id', ref: 'accounts', fk: 'fk_bank_rules_transfer_account' },
  { name: 'assign_deal_id', ref: 'projects', fk: 'fk_bank_rules_deal' },
  { name: 'assign_deal_stage_id', ref: 'deal_stages', fk: 'fk_bank_rules_deal_stage' },
  { name: 'assign_project_id', ref: 'projects', fk: 'fk_bank_rules_project' },
  { name: 'assign_contact_id', ref: 'contacts', fk: 'fk_bank_rules_contact' },
  { name: 'assign_tag', add: (t) => t.string('assign_tag', 64).nullable() },
];

exports.up = async (knex) => {
  // По одной колонке: повторный прогон после падения на середине докатит
  // недостающие и не споткнётся о те, что уже есть.
  for (const column of COLUMNS) {
    if (await bankRuleColumnExists(knex, column.name)) continue;
    await knex.schema.alterTable('bank_rules', (table) => {
      if (column.add) {
        column.add(table);
        return;
      }
      table.integer(column.name).unsigned().nullable();
      table
        .foreign(column.name, column.fk)
        .references('id')
        .inTable(column.ref)
        .onDelete('SET NULL');
    });
  }
};

exports.down = async (knex) => {
  for (const column of [...COLUMNS].reverse()) {
    if (!(await bankRuleColumnExists(knex, column.name))) continue;
    await knex.schema.alterTable('bank_rules', (table) => {
      if (column.fk) table.dropForeign([column.name], column.fk);
      if (column.name === 'rule_type') table.dropIndex(['rule_type'], 'idx_rules_type');
      table.dropColumn(column.name);
    });
  }
};
