// © 2026 Bigfin
// Этап 15 ТЗ. Персональные токены публичного API.
//
// ПОЧЕМУ В ОБЩЕЙ (system) СХЕМЕ, А НЕ В БАЗЕ ОРГАНИЗАЦИИ.
// Токен приходит в заголовке `Authorization: Bearer bgf_...` и БОЛЬШЕ НИЧЕГО
// не приносит: организация ещё неизвестна. Чтобы найти токен в базе
// организации, надо сначала знать организацию — а её как раз и определяет
// токен. Лежи таблица в тенантной схеме, пришлось бы обходить базы всех
// организаций подряд на каждый запрос.
//
// В таблице лежит ТОЛЬКО отпечаток (sha256), самого токена нет нигде:
// утечка этой таблицы не даёт доступа ни к одной организации.
exports.up = async (knex) => {
  await knex.schema.createTable('api_tokens', (table) => {
    table.increments('id');

    table
      .bigInteger('tenant_id')
      .unsigned()
      .notNullable()
      .index()
      .references('id')
      .inTable('tenants');

    // Чей это токен — чтобы в журнале было видно, кто им пользуется.
    table.integer('user_id').unsigned().nullable();

    table.string('name').notNullable();

    // Отпечаток уникален: два одинаковых токена — это ошибка выпуска.
    table.string('token_hash', 64).notNullable().unique();

    // Хвост показывается человеку в списке: узнать свой токен, не раскрывая.
    table.string('last_four', 8).notNullable();

    // Права строкой JSON: список вида ["reports:read","transactions:write"].
    // Пустой список — это НЕ «можно всё», см. utils/apiTokens.ts.
    table.text('scopes').nullable();

    // Срок жизни необязателен: ТЗ требует возможности срока, а не
    // принудительного срока. Навязанный срок ломал бы интеграции молча.
    table.dateTime('expires_at').nullable();
    table.dateTime('revoked_at').nullable();

    // Для ответа на вопрос «этим токеном вообще пользуются?» перед отзывом.
    table.dateTime('last_used_at').nullable();

    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('api_tokens');
};
