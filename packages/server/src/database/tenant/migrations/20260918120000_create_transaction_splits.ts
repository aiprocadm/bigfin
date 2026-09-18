// © 2026 Bigfin
// Этап 10 ТЗ. Разделение операции на части.
//
// Одна платёжка на 100 000 ₽ = аренда 70 000 + коммунальные 30 000. Части
// хранятся отдельными строками, а родительская операция остаётся как была:
// в отчёты идут части, в выписку и сверку с банком — родитель. Иначе сверка
// перестанет сходиться с банком, а это первое, что проверяют.
exports.up = (knex) => {
  return knex.schema.createTable('transaction_splits', (table) => {
    table.increments('id');

    // На что ссылается часть: тот же способ адресации, что у проводок.
    table.string('reference_type').notNullable();
    table.integer('reference_id').unsigned().notNullable();

    table.decimal('amount', 15, 5).notNullable();

    // Ради чего всё затевалось: своя статья у каждой части.
    table.integer('article_id').unsigned().nullable().index();
    table.integer('project_id').unsigned().nullable().index();
    table.integer('legal_entity_id').unsigned().nullable().index();

    table.string('note').nullable();

    // Отчёты спрашивают «части такой-то операции» — один индекс на пару.
    table.index(['reference_type', 'reference_id'], 'idx_split_reference');

    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('transaction_splits');
