// © 2026 Bigfin
// D16 ТЗ-3 (FT-080). Ограничения роли по строкам: статьи, направления, счета.
//
// Три списка номеров в JSON-строке. ПУСТО (NULL) ЗНАЧИТ «ВСЕ»: владелец и
// роли, которым ничего не сужали, ничего не настраивают. Список заполняется
// только там, где доступ сужают, — как у юрлиц (миграция 20260919210000).
//
// TEXT, а не таблица связи: списки короткие, читаются всегда целиком вместе
// с ролью и никогда не соединяются запросом.

const ROW_SCOPE_TABLE = 'roles';
const ROW_SCOPE_COLUMNS = ['allowed_article_ids', 'allowed_project_ids', 'allowed_account_ids'];

// Имя без оглядки на регистр: схема организации лежит ЗАГЛАВНЫМИ буквами,
// и обычный hasColumn ответил бы «нет» про существующую колонку.
const roleColumnExists = async (knex, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE() AND LOWER(table_name) = ? AND LOWER(column_name) = ?`,
    [ROW_SCOPE_TABLE, column],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  const missing = [];
  for (const column of ROW_SCOPE_COLUMNS) {
    if (!(await roleColumnExists(knex, column))) missing.push(column);
  }
  if (!missing.length) return;
  await knex.schema.alterTable(ROW_SCOPE_TABLE, (table) => {
    missing.forEach((column) => table.text(column).nullable());
  });
};

exports.down = async (knex) => {
  const present = [];
  for (const column of ROW_SCOPE_COLUMNS) {
    if (await roleColumnExists(knex, column)) present.push(column);
  }
  if (!present.length) return;
  await knex.schema.alterTable(ROW_SCOPE_TABLE, (table) => {
    present.forEach((column) => table.dropColumn(column));
  });
};
