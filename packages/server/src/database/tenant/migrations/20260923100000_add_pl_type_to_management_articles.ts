// © 2026 Bigfin
// FT-009 ТЗ-3, D1. Управленческий тип статьи для отчёта о прибыли — третье
// измерение статьи рядом с видом (`kind`) и разделом движения денег
// (`cashflow_section`). Из него строятся ярусы МД → ВП1 → ВП2 → ОП → ЧП.
//
// NULLABLE — намеренно. Пустой тип у дочерней статьи значит «как у
// родителя», у корневой — «не отнесено к ярусу», и такая статья видна в
// отчёте отдельной строкой. Проставить тип пользовательским статьям нечем:
// угадывать его по названию запрещает раздел 34 ТЗ-3. Предустановленным
// статьям тип ставит следующая миграция, по устойчивому ключу `seed_key`.
//
// Домен (10 значений) живёт в коде — `ManagementArticles/utils/plTypes.ts`.
// CHECK-ограничение не используем: MySQL до 8.0.16 молча его игнорирует.
//
// ПОЧЕМУ information_schema, А НЕ hasColumn. Продукт отображает имена в
// ВЕРХНИЙ регистр, и к имени, переданному в `hasColumn`, отображение не
// применяется: на MySQL под Linux проверка отвечает «нет» про существующую
// колонку. Подробно — в `20260918100100_add_legal_entity_id_columns.ts`.
// Помощник написан здесь, а не взят из общего модуля: миграция —
// исторический документ. Приставка в имени — потому что объявления верхнего
// уровня у всех миграций живут в одном пространстве имён.

const plTypeColumnExists = async (knex) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'management_articles'
        AND LOWER(column_name) = 'pl_type'`,
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  // Повторный прогон после падения на середине не должен спотыкаться:
  // DDL в MySQL необратим.
  if (await plTypeColumnExists(knex)) return;

  await knex.schema.alterTable('management_articles', (table) => {
    table.string('pl_type', 32).nullable();
    // Управленческий ОПиУ собирает статьи по ярусу — индекс отвечает на
    // «все статьи яруса» одним проходом.
    table.index(['pl_type'], 'idx_mgmt_articles_pl_type');
  });
};

exports.down = async (knex) => {
  if (!(await plTypeColumnExists(knex))) return;

  await knex.schema.alterTable('management_articles', (table) => {
    table.dropIndex(['pl_type'], 'idx_mgmt_articles_pl_type');
    table.dropColumn('pl_type');
  });
};
