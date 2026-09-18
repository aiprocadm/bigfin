// © 2026 Bigfin
// Этап 6 ТЗ, §6.1. Юрлицо группы: своя таблица в ТЕНАНТНОЙ схеме — юрлица
// принадлежат одной организации, а не общие между ними.
//
// Колонка `is_primary` — головное юрлицо группы. Уникальности на неё не
// ставим: пока юрлицо одно, оно и головное, а при добавлении второго выбор
// делает человек. Жёсткий индекс тут мешал бы переключать головное без
// промежуточного состояния.
exports.up = (knex) => {
  return knex.schema.createTable('legal_entities', (table) => {
    table.increments('id');

    table.string('name').notNullable(); // «ООО Ромашка»
    table.string('full_name').nullable(); // полное наименование
    table.string('form').notNullable().index(); // ООО | ИП | АО | НКО | Самозанятый

    // Реквизиты. Хранятся строками: ИНН и ОГРН — не числа, ведущий ноль
    // значащий, а арифметики над ними не бывает.
    table.string('inn', 12).nullable().index();
    table.string('kpp', 9).nullable(); // у ИП его нет
    table.string('ogrn', 15).nullable();

    table.string('tax_system').nullable(); // ОСНО | УСН_Д | УСН_ДР | АУСН | ЕСХН | ПСН | НПД
    table.boolean('vat_payer').notNullable().defaultTo(false);
    table.string('base_currency', 3).notNullable().defaultTo('RUB');

    table.string('director_name').nullable();
    table.string('legal_address').nullable();
    table.string('actual_address').nullable();
    table.json('bank_details').nullable(); // р/с, банк, БИК, к/с

    // Доля владельца в процентах: нужна консолидации (этап 7).
    table.decimal('ownership_share', 5, 2).notNullable().defaultTo(100);

    table.boolean('is_primary').notNullable().defaultTo(false);
    table.boolean('active').notNullable().defaultTo(true);
    table.integer('sort_order').notNullable().defaultTo(0);

    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('legal_entities');
