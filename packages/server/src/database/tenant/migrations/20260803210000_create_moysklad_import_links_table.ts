// © 2026 Bigfin
// Связки импорта из МойСклад (㉛): идемпотентность обмена справочником.
// Форма повторяет onec_import_links и crm_sync_links — объединение трёх
// таблиц в одну общую вынесено отдельной задачей (см. спеку ㉛, §3).
exports.up = (knex) =>
  knex.schema.createTable('moysklad_import_links', (table) => {
    table.increments('id');
    table.string('entity_type').notNullable(); // 'item'
    table.string('external_id').notNullable();
    table.integer('entity_id').unsigned().notNullable();
    table.timestamps();

    table.unique(['entity_type', 'external_id']);
    table.index(['entity_type']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('moysklad_import_links');
