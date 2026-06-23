/**
 * Системная таблица токенов входящего webhook собственной CRM (⑯c).
 * Токен → тенант: позволяет публичному webhook-эндпоинту (без auth-сессии)
 * определить организацию и выполнить импорт в её контексте (паттерн Plaid).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('crm_webhook_tokens', (table) => {
    table.increments('id');
    table.integer('tenant_id').unsigned().notNullable();
    table.string('token').notNullable().unique();
    table.timestamps();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('crm_webhook_tokens');
};
