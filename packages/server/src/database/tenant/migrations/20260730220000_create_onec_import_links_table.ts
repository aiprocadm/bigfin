// © 2026 Bigfin
// Таблица связок импорта из 1С (⑩ CommerceML): идемпотентность обмена.
// Хранит соответствие (тип сущности, идентификатор 1С) → id сущности Bigfin,
// чтобы повторная загрузка того же файла обновляла карточки, а не плодила их.
exports.up = (knex) =>
  knex.schema.createTable('onec_import_links', (table) => {
    table.increments('id');
    table.string('entity_type').notNullable(); // 'item' | 'contact'
    table.string('external_id').notNullable();
    table.integer('entity_id').unsigned().notNullable();
    table.timestamps();

    table.unique(['entity_type', 'external_id']);
    table.index(['entity_type']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('onec_import_links');
