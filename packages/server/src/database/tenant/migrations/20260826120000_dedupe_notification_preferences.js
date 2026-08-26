/**
 * Уборка дублей правил уведомлений (Н4 карты v22).
 *
 * Предыдущая миграция (`20260826110000`) должна была добавить только
 * недостающие правила, но читала поле ответа как `event_type`, а тенантный
 * knex настроен через `knexSnakeCaseMappers({ upperCase: true })` и
 * возвращает поля в camelCase. Список «что уже есть» получался пустым, и
 * правила вставлялись заново — у организации с настроенными правилами
 * появлялись их двойники.
 *
 * Эта миграция оставляет по одному правилу на событие — самое РАННЕЕ,
 * то есть то, которое человек мог настроить (каналы, пороги, выключение).
 * Более поздние двойники удаляются.
 *
 * Идемпотентна: если дублей нет, ничего не делает.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const rows = await knex('notification_preferences').select('id', 'event_type');

  const seen = new Map();
  const extra = [];

  // Порядок по id: меньший id — более раннее правило.
  rows
    .map((row) => ({
      id: row.id,
      eventType: row.eventType ?? row.event_type,
    }))
    .sort((a, b) => a.id - b.id)
    .forEach((row) => {
      if (!row.eventType) return;

      if (seen.has(row.eventType)) {
        extra.push(row.id);
      } else {
        seen.set(row.eventType, row.id);
      }
    });

  if (!extra.length) return;

  await knex('notification_preferences').whereIn('id', extra).delete();
};

/**
 * Откат не восстанавливает дубли: они были ошибкой, а не данными.
 *
 * @returns { Promise<void> }
 */
exports.down = async function () {};
