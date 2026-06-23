// © 2026 Bigfin
// Таблица связок импорта из CRM (⑯a): идемпотентность синхронизации CRM → Bigfin.
// Хранит соответствие (коннектор, внешний id, тип) → id сущности Bigfin.
exports.up = (knex) =>
  knex.schema.createTable('crm_sync_links', (table) => {
    table.increments('id');
    table.string('connector_key').notNullable();
    table.string('external_id').notNullable();
    table.string('entity_type').notNullable(); // 'contact' | 'deal'
    table.integer('entity_id').unsigned().notNullable();
    table.timestamps();

    table.unique(['connector_key', 'external_id', 'entity_type']);
    table.index(['connector_key', 'entity_type']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('crm_sync_links');
