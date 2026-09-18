// © 2026 Bigfin
// Этап 15 ТЗ. Подписки на вебхуки и журнал доставок.
//
// В отличие от токенов (они в общей схеме — там по токену ещё только предстоит
// узнать организацию), подписка ПРИНАДЛЕЖИТ одной организации: это её адрес,
// её события, её секрет. Значит — тенантная схема.
exports.up = async (knex) => {
  await knex.schema.createTable('webhooks', (table) => {
    table.increments('id');

    table.string('event').notNullable().index();
    table.string('url', 1000).notNullable();

    // Секрет подписи: получатель по нему отличает наш вызов от подделки.
    // Адрес вебхука рано или поздно узнают, и без подписи любой сможет
    // прислать «кассовый разрыв».
    table.string('secret').notNullable();

    // Выключить подписку, не теряя её настройки и историю доставок.
    table.boolean('active').notNullable().defaultTo(true);

    table.timestamps();
  });

  // Журнал доставок. Без него на вопрос «почему мне не пришло событие?»
  // ответить нечем: наружу уходит вызов, который нигде не оставляет следа.
  await knex.schema.createTable('webhook_deliveries', (table) => {
    table.increments('id');

    table
      .integer('webhook_id')
      .unsigned()
      .notNullable()
      .index()
      .references('id')
      .inTable('webhooks')
      .onDelete('CASCADE');

    table.string('event').notNullable();
    table.text('payload').notNullable();

    // Сколько раз пытались и чем кончилось.
    table.integer('attempts').notNullable().defaultTo(0);
    table.integer('status_code').nullable();
    table.text('error').nullable();

    // Когда запланирована следующая попытка. Пусто — попыток больше не будет.
    table.dateTime('next_attempt_at').nullable().index();
    table.dateTime('delivered_at').nullable();

    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('webhook_deliveries');
  await knex.schema.dropTableIfExists('webhooks');
};
