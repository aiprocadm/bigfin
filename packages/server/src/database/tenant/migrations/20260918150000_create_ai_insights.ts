// © 2026 Bigfin
// Этап 13 ТЗ. Кеш выводов ИИ-аналитика.
//
// ТЗ §13.3: «Формируется раз в сутки фоновой задачей, кешируется. Не по
// запросу — иначе дорого и медленно».
//
// Хранится РЕЗУЛЬТАТ, а не запрос: каждое открытие главной страницы иначе
// било бы в платную модель, и десять человек в организации за утро оплатили
// бы десять одинаковых ответов, каждый подождав по несколько секунд.
exports.up = async (knex) => {
  await knex.schema.createTable('ai_insights', (table) => {
    table.increments('id');

    // Где показывается: `dashboard`, `profit_loss`, `cash_flow`,
    // `balance_sheet`.
    table.string('scope').notNullable();
    // За какой день сформировано — по нему видно, что кеш протух.
    table.date('generated_for').notNullable();

    // Наблюдения списком JSON: текст, ссылка, ключ отчёта.
    table.text('insights').notNullable();

    // Сколько наблюдений модель выдала и сколько мы отбраковали по сверке
    // чисел. Без этого счётчика невозможно понять, что модель начала врать:
    // на экране-то остаются только принятые.
    table.integer('suggested_count').notNullable().defaultTo(0);
    table.integer('rejected_count').notNullable().defaultTo(0);

    // Чем сформировано — чтобы после смены провайдера было видно, какие
    // выводы от старого.
    table.string('provider').nullable();

    table.unique(['scope', 'generated_for'], 'uq_ai_insights_scope_day');

    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('ai_insights');
};
