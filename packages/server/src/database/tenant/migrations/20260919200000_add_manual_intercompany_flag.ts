// © 2026 Bigfin
import { Knex } from 'knex';

/**
 * Признак «внутригрупповая операция», поставленный ВРУЧНУЮ (этап 7 ТЗ, §7.2,
 * остаток К2).
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ КОЛОНКА У ДОКУМЕНТА. Проводки помечаются автоматически: если
 * ноги операции принадлежат разным известным юрлицам, она внутригрупповая.
 * Но у автоматики есть слепое пятно — юрлицо она берёт со счёта, а «неизвестное
 * юрлицо не считается другим». Перевод собственной компании, оформленный
 * документом на контрагента, автоматика не увидит НИКОГДА.
 *
 * Поэтому человеку нужен выключатель. Его выбор должен пережить правку
 * документа, а проводки при правке пересобираются заново — значит хранить
 * выбор надо у самого документа, а не у проводки.
 *
 * ДВЕ ТАБЛИЦЫ. «Ручная операция» в продукте бывает двух видов: запись в журнал
 * проводок и приход/расход денег. Выключатель нужен обеим — иначе он работает
 * через раз, и это хуже, чем если бы его не было вовсе.
 */
const TABLES = ['manual_journals', 'cashflow_transactions'];

/**
 * Есть ли колонка — без оглядки на регистр имени.
 *
 * Схема тенанта живёт в ВЕРХНЕМ регистре (`MANUAL_JOURNALS`), а код пишет
 * имена строчными. `hasColumn` сравнивает как есть и на живой базе отвечает
 * «нет» для существующей колонки — миграция молча ничего не делает.
 */
async function manualIntercompanyHasColumn(
  knex: Knex,
  table: string,
  column: string,
): Promise<boolean> {
  const result: any = await knex.raw(
    `SELECT COUNT(*) AS total
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [table.toLowerCase(), column.toLowerCase()],
  );
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;

  return Number(first?.total ?? first?.TOTAL ?? 0) > 0;
}

async function manualIntercompanyHasTable(
  knex: Knex,
  table: string,
): Promise<boolean> {
  const result: any = await knex.raw(
    `SELECT COUNT(*) AS total
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?`,
    [table.toLowerCase()],
  );
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;

  return Number(first?.total ?? first?.TOTAL ?? 0) > 0;
}

export async function up(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    if (!(await manualIntercompanyHasTable(knex, table))) continue;
    if (await manualIntercompanyHasColumn(knex, table, 'is_intercompany')) {
      continue;
    }

    await knex.schema.alterTable(table, (builder) => {
      // По умолчанию выключено: подавляющее большинство операций — обычные,
      // и включённый по умолчанию признак вычел бы из отчётов настоящую
      // выручку.
      builder.boolean('is_intercompany').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    if (!(await manualIntercompanyHasTable(knex, table))) continue;
    if (!(await manualIntercompanyHasColumn(knex, table, 'is_intercompany'))) {
      continue;
    }

    await knex.schema.alterTable(table, (builder) => {
      builder.dropColumn('is_intercompany');
    });
  }
}
