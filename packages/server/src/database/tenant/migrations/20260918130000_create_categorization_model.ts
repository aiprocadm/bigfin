// © 2026 Bigfin
// Этап 12 ТЗ. Модель разноса операций по истории — своя у каждой организации.
//
// ТЗ решает прямо: БЕЗ внешнего ИИ. Задача классическая, и локальное решение
// выигрывает по трём причинам: данные не покидают контур (важно для тех, кто
// ставит продукт на свой сервер), нет платы за обращения, и подсказку можно
// объяснить словами.
//
// Веса хранятся, а не считаются на лету: пересчёт по всей истории на каждое
// открытие списка операций — это секунды ожидания на ровном месте.
exports.up = async (knex) => {
  await knex.schema.createTable('categorization_model', (table) => {
    table.increments('id');

    table.string('word').notNullable();
    table.integer('article_id').unsigned().notNullable();
    table.integer('weight').notNullable().defaultTo(0);

    // Подсказку ищут по слову — индекс на пару, а не на каждое поле.
    table.unique(['word', 'article_id'], 'uq_categorization_word_article');

    table.timestamps();
  });

  // Счётчик точности для настроек: «за месяц предложено 240, принято 218».
  // Без него переключатель «Подсказывать статьи» нечем обосновать.
  await knex.schema.createTable('categorization_feedback', (table) => {
    table.increments('id');

    table.integer('article_id').unsigned().notNullable();
    table.integer('suggested_article_id').unsigned().nullable();
    table.boolean('accepted').notNullable().defaultTo(false);
    table.date('date').notNullable().index();

    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('categorization_feedback');
  await knex.schema.dropTableIfExists('categorization_model');
};
