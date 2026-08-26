// © 2026 Bigfin
// У1 карты v27: свежий суточный повтор события вытесняет прежнюю запись
// ленты. Вытесненные строки лента и бейдж не показывают, но в таблице они
// остаются — по ним считается срок «не повторять чаще».
//
// Всё написано билдером запросов, БЕЗ сырого SQL: подключение включает
// knexSnakeCaseMappers({ upperCase: true }), то есть настоящие имена в базе
// ВЕРХНИМ регистром (NOTIFICATIONS), и сырой SQL со строчными именами их не
// находит. Проверка hasColumn — защита от полудоехавшей базы: DDL в MySQL
// необратим, упавший после alterTable прогон оставляет колонку созданной.
exports.up = async (knex) => {
  const hasColumn = await knex.schema.hasColumn('notifications', 'superseded_at');
  if (!hasColumn) {
    await knex.schema.alterTable('notifications', (table) => {
      table.dateTime('superseded_at').nullable().index();
    });
  }

  // Разовая уборка накопившегося: всё, кроме самой свежей записи каждого
  // события, считается вытесненным (у демо-организации лента успела дорасти
  // до 33 одинаковых строк). При равном fired_at свежее — большее id.
  await knex('notifications as n')
    .join('notifications as newer', function joinNewer() {
      this.on('newer.dedup_key', '=', 'n.dedup_key').andOn(function newerWins() {
        this.on('newer.fired_at', '>', 'n.fired_at').orOn(function sameMoment() {
          this.on('newer.fired_at', '=', 'n.fired_at').andOn(
            'newer.id',
            '>',
            'n.id',
          );
        });
      });
    })
    .update({ 'n.superseded_at': knex.ref('newer.fired_at') });
};

exports.down = (knex) =>
  knex.schema.alterTable('notifications', (table) => {
    table.dropColumn('superseded_at');
  });
