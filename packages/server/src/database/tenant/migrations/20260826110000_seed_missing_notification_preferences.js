/**
 * Правила уведомлений для уже созданных организаций (Н4 карты v22).
 *
 * Правила заводятся сидом при сборке организации, поэтому новое событие
 * («скоро платить налог») появилось бы только у тех, кто заведётся после.
 * У всех существующих организаций правила бы не было — и напоминание,
 * ради которого всё делалось, до них бы не дошло.
 *
 * Миграция добавляет только НЕДОСТАЮЩИЕ правила: те, что человек уже
 * настроил (в том числе выключил), не трогаются вовсе.
 *
 * `channels` пишем явно: MySQL и MariaDB игнорируют `defaultTo` у колонок
 * TEXT, и вставка без него падает с ER_NO_DEFAULT_FOR_FIELD — ровно на этом
 * 25 августа сломалась сборка новых организаций.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const events = ['cash_gap', 'low_balance', 'overdue', 'tax_due'];

  // Тенантный knex настроен через knexSnakeCaseMappers({ upperCase: true }):
  // имена таблиц уходят в базу в ВЕРХНЕМ регистре, а поля ответа приходят
  // обратно в camelCase. Читать `row.event_type` здесь нельзя — вернётся
  // `undefined`, все правила покажутся отсутствующими и вставятся заново
  // (так и случилось на стенде: 4 дубля). Берём оба написания, чтобы
  // миграция не зависела от настроек соединения.
  const existing = await knex('notification_preferences').select('event_type');
  const known = new Set(
    existing.map((row) => row.eventType ?? row.event_type).filter(Boolean),
  );
  const missing = events.filter((event) => !known.has(event));

  if (!missing.length) return;

  await knex('notification_preferences').insert(
    missing.map((eventType) => ({
      event_type: eventType,
      enabled: true,
      channels: JSON.stringify(['email']),
    })),
  );
};

/**
 * Откат не удаляет правила: человек мог их настроить, и снос настроек ради
 * отката миграции — потеря его работы. Пустой `down` здесь осознан.
 *
 * @returns { Promise<void> }
 */
exports.down = async function () {};
