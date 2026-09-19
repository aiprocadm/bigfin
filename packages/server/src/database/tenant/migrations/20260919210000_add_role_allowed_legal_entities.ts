// © 2026 Bigfin
import { Knex } from 'knex';

/**
 * Разрешённые юрлица у роли (этап 8 ТЗ, §8.4, остаток К6).
 *
 * ТЗ формулирует это одной фразой: «бухгалтеру ИП видно только ИП, владельцу —
 * всё». Правило отбора было написано и проверено, но хранить выбор было негде,
 * и звать его было неоткуда — возможность существовала только на бумаге.
 *
 * ПУСТО ЗНАЧИТ «ВСЕ». Владелец и администратор не должны ничего настраивать,
 * чтобы видеть свою же организацию целиком. Список заполняется только там, где
 * доступ и правда сужают.
 *
 * Ошибка здесь — это показанные чужие деньги, поэтому колонка допускает NULL,
 * а не пустой список: «не настраивали» и «настроили пустым» должны различаться
 * на будущее.
 */
const TABLE = 'roles';
const COLUMN = 'allowed_legal_entity_ids';

/**
 * Есть ли колонка — без оглядки на регистр имени.
 *
 * Схема тенанта живёт в ВЕРХНЕМ регистре, а код пишет строчными: `hasColumn`
 * сравнивает как есть и на живой базе отвечает «нет» для существующей
 * колонки — миграция молча ничего не делает.
 */
async function roleLegalEntitiesHasColumn(knex: Knex): Promise<boolean> {
  const result: any = await knex.raw(
    `SELECT COUNT(*) AS total
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [TABLE, COLUMN],
  );
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;

  return Number(first?.total ?? first?.TOTAL ?? 0) > 0;
}

export async function up(knex: Knex): Promise<void> {
  if (await roleLegalEntitiesHasColumn(knex)) return;

  await knex.schema.alterTable(TABLE, (builder) => {
    // JSON, а не таблица связи: список короткий (юрлиц у группы единицы),
    // читается всегда целиком и никогда не соединяется запросом.
    builder.json(COLUMN).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  if (!(await roleLegalEntitiesHasColumn(knex))) return;

  await knex.schema.alterTable(TABLE, (builder) => {
    builder.dropColumn(COLUMN);
  });
}
