// © 2026 Bigfin
// У1 карты v27: свежий суточный повтор события вытесняет прежнюю запись
// ленты. Вытесненные строки лента и бейдж не показывают, но в таблице они
// остаются — по ним считается срок «не повторять чаще».
exports.up = async (knex) => {
  await knex.schema.alterTable('notifications', (table) => {
    table.dateTime('superseded_at').nullable().index();
  });

  // Разовая уборка накопившегося: всё, кроме самой свежей записи каждого
  // события, считается вытесненным (у демо-организации лента успела дорасти
  // до 33 одинаковых строк). При равном fired_at свежее — большее id.
  await knex.raw(`
    UPDATE notifications n
    JOIN notifications newer
      ON newer.dedup_key = n.dedup_key
     AND (newer.fired_at > n.fired_at
          OR (newer.fired_at = n.fired_at AND newer.id > n.id))
    SET n.superseded_at = newer.fired_at
  `);
};

exports.down = (knex) =>
  knex.schema.alterTable('notifications', (table) => {
    table.dropColumn('superseded_at');
  });
