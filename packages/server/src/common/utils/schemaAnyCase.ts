// © 2026 Bigfin
/**
 * Есть ли таблица/колонка — БЕЗ УЧЁТА РЕГИСТРА имени.
 *
 * ЗАЧЕМ ЭТО НУЖНО. Продукт работает с базой через отображение имён:
 * `knexSnakeCaseMappers({ upperCase: true })`. В коде пишут
 * `accounts_transactions`, а в базе таблица лежит как `ACCOUNTS_TRANSACTIONS`.
 * Отображение применяется к именам В ЗАПРОСАХ — и НЕ применяется к строке,
 * которую передают в `knex.schema.hasTable(...)`: там имя уезжает значением, а
 * не именем.
 *
 * На MySQL под Linux (`lower_case_table_names = 0`) имена таблиц чувствительны
 * к регистру. Поэтому `hasTable('accounts_transactions')` отвечает «НЕТ» про
 * существующую таблицу.
 *
 * Чем это опасно. Ответ «нет» почти всегда читается как «этой таблицы у
 * организации нет, пропускаем» — и код спокойно идёт дальше. Ничего не падает.
 * Так миграция этапа 6 прошла ВЕСЬ список из 13 таблиц мимо и записалась
 * выполненной: колонки `legal_entity_id` не появилось ни одной, а журнал
 * миграций утверждает, что всё применено.
 *
 * Тот же самый капкан описан в миграции `20260824100000_add_build_job_...`
 * ещё в августе — и через месяц в него наступили снова. Поэтому проверка
 * живёт здесь, одна на всех, а сторож `noRawSchemaExistenceChecks.spec.ts`
 * не даёт звать `schema.hasTable` напрямую.
 *
 * Сравнение идёт по нижнему регистру с обеих сторон — так ответ одинаков и на
 * базе с заглавными именами (стенд, production), и на базе со строчными.
 */

/** Есть ли таблица с таким именем в текущей базе. */
export async function hasTableAnyCase(
  knex: any,
  table: string,
): Promise<boolean> {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?`,
    [table.toLowerCase()],
  );

  return Number(rows[0].count) > 0;
}

/** Есть ли колонка в таблице с такими именами в текущей базе. */
export async function hasColumnAnyCase(
  knex: any,
  table: string,
  column: string,
): Promise<boolean> {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [table.toLowerCase(), column.toLowerCase()],
  );

  return Number(rows[0].count) > 0;
}
