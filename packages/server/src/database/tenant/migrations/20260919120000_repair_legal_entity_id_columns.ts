// © 2026 Bigfin
// ДОГОНЯЮЩАЯ миграция к `20260918100100_add_legal_entity_id_columns`.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ, а не правка той миграции. Та уже записана в журнале
// как выполненная — на стенде и везде, куда успели выкатиться. Журнал не
// перезапускает применённое, поэтому исправление в старом файле не догонит
// базу, которая его «уже применила».
//
// Что произошло. Первая версия проверяла наличие таблицы через
// `knex.schema.hasTable('accounts_transactions')`. Продукт отображает имена в
// ВЕРХНИЙ регистр, в базе таблица зовётся `ACCOUNTS_TRANSACTIONS`, а к имени в
// `hasTable` отображение не применяется — оно уезжает значением. На MySQL под
// Linux имена таблиц чувствительны к регистру, и ответ был «нет» про каждую из
// 13 таблиц. Миграция прошла весь список мимо и записалась выполненной: ни
// одной колонки `legal_entity_id` не появилось, а журнал утверждал обратное.
//
// Эта миграция доносит колонки туда, где их не хватает. На базе, где всё в
// порядке, она ничего не делает.
//
// `down` пустой НАМЕРЕННО — и это осознанное исключение из правила «миграция
// без отката — мина». Откатывать здесь нечего: колонки принадлежат миграции
// `20260918100100`, её `down` их и снимает. Если бы этот файл тоже их удалял,
// откат на один шаг унёс бы чужие колонки вместе с данными.
// ИМЕНА С ПРИСТАВКОЙ. Миграции — глобальные скрипты без ввозов, и объявления
// верхнего уровня у всех файлов живут в ОДНОМ пространстве имён. Одинаковое
// имя в двух миграциях — ошибка проверки типов. Поэтому у помощников здесь
// приставка по смыслу файла.
const REPAIR_TABLES = [
  'accounts_transactions',
  'accounts',
  'sales_invoices',
  'bills',
  'sales_estimates',
  'sales_receipts',
  'expenses_transactions',
  'manual_journals',
  'credits',
  'fixed_assets',
  'dividend_payouts',
  'planned_operations',
  'budgets',
];

// Наружу — под общим именем: приставка нужна только локальной переменной.
exports.TABLES = REPAIR_TABLES;

/** Есть ли таблица — сравнение имени БЕЗ учёта регистра. */
const repairLegalEntityHasTable = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?`,
    [String(table).toLowerCase()],
  );
  return Number(rows[0].count) > 0;
};

/** Есть ли колонка — сравнение имён БЕЗ учёта регистра. */
const repairLegalEntityHasColumn = async (knex, table, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [String(table).toLowerCase(), String(column).toLowerCase()],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  for (const tableName of REPAIR_TABLES) {
    if (!(await repairLegalEntityHasTable(knex, tableName))) continue;
    if (await repairLegalEntityHasColumn(knex, tableName, 'legal_entity_id')) continue;

    await knex.schema.alterTable(tableName, (table) => {
      const column = table.integer('legal_entity_id').unsigned().nullable();

      // У проводок отчёты всегда спрашивают «юрлицо за период» — составной
      // индекс отвечает на это одним проходом. У остальных разрез идёт без
      // даты, там достаточно одиночного.
      if (tableName === 'accounts_transactions') {
        table.index(['legal_entity_id', 'date'], 'idx_txn_legal_entity_date');
      } else {
        column.index();
      }
    });
  }
};

exports.down = async () => {
  // Пусто намеренно — см. пояснение в шапке файла.
};
