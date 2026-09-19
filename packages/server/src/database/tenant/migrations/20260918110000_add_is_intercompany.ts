// © 2026 Bigfin
// Этап 7 ТЗ, §7.2. Признак внутригрупповой операции.
//
// Если ООО перевело ИП 500 000 ₽, у группы не появилось ни дохода, ни
// расхода — деньги остались внутри. Без такого признака консолидированный
// ОПиУ завышает и выручку, и расходы сразу.
//
// Признак хранится, а не вычисляется на лету, по двум причинам: ТЗ даёт
// человеку переключатель «Внутригрупповая операция» в ручной операции
// (§7.2 п. 2), и его выбор должен пережить перезагрузку; а отчёты обязаны
// уметь отбирать по признаку одним условием, а не сверкой юрлиц на каждой
// строке.
//
// По умолчанию `false`, а не пусто: пустое значение в отчётах пришлось бы
// трактовать, и каждый отчёт трактовал бы по-своему.

/**
 * Есть ли колонка — сравнение имён БЕЗ учёта регистра.
 *
 * `knex.schema.hasColumn` и `knex.schema.hasTable` ведут себя ПО-РАЗНОМУ на
 * базе, где имена таблиц заглавные (продукт отображает их
 * `knexSnakeCaseMappers({ upperCase: true })`): первый отвечает верно, второй
 * — «нет» про существующую таблицу. Разница невидима и однажды уже стоила
 * целой миграции этапа 6, прошедшей мимо всех таблиц. Поэтому спрашиваем сами.
 *
 * Помощник написан здесь, а не взят из общего модуля: миграция — исторический
 * документ, она обязана работать одинаково и через год.
 */
const intercompanyHasColumn = async (knex, table, column) => {
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
  const hasColumn = await intercompanyHasColumn(
    knex,
    'accounts_transactions',
    'is_intercompany',
  );
  if (hasColumn) return;

  await knex.schema.alterTable('accounts_transactions', (table) => {
    table.boolean('is_intercompany').notNullable().defaultTo(false).index();
  });
};

exports.down = async (knex) => {
  const hasColumn = await intercompanyHasColumn(
    knex,
    'accounts_transactions',
    'is_intercompany',
  );
  if (!hasColumn) return;

  await knex.schema.alterTable('accounts_transactions', (table) => {
    table.dropColumn('is_intercompany');
  });
};
