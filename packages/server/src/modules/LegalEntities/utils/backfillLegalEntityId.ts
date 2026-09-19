// © 2026 Bigfin
import { LEGAL_ENTITY_TABLES } from '../constants';
import { BACKFILL_BATCH_SIZE, BACKFILL_MAX_BATCHES } from '../constants';

export interface BackfillTableResult {
  table: string;
  updated: number;
  /** Дошли до потолка пакетов — остаток заберёт следующий запуск. */
  incomplete: boolean;
}

/**
 * Заполнение `legal_entity_id` у существующих строк (этап 6 ТЗ, §6.3 шаг 3).
 *
 * Вынесено из службы отдельной функцией, чтобы у неё был ровно один
 * исполнитель. Запускать заполнение нужно из двух мест — из очереди задач
 * внутри продукта и командой из терминала при выкатке, — и если бы код был
 * написан дважды, две копии разошлись бы: одна трогала бы уже заполненные
 * строки, другая нет, и заметить это было бы нечем.
 *
 * Два правила, которые важнее скорости:
 *
 * 1. **Трогаем только пустые.** Условие `legal_entity_id IS NULL` — не
 *    оптимизация, а защита: строке могли уже назначить юрлицо руками, и
 *    заполнение не должно переписать этот выбор на «по умолчанию».
 *
 * 2. **Пакетами.** У живой организации в проводках сотни тысяч строк. Один
 *    UPDATE на всю таблицу держит блокировку так долго, что продукт встаёт.
 *
 * Из первого правила бесплатно следует возобновляемость: заполнение можно
 * прервать и запустить заново — оно продолжит с того места, где остановилось,
 * потому что заполненные строки в выборку больше не попадают.
 */
export async function backfillLegalEntityIdInTables(
  knex: any,
  legalEntityId: number,
  tables: readonly string[] = LEGAL_ENTITY_TABLES,
): Promise<BackfillTableResult[]> {
  const results: BackfillTableResult[] = [];

  for (const table of tables) {
    results.push(await backfillOneTable(knex, table, legalEntityId));
  }

  return results;
}

/**
 * Одна таблица, пакет за пакетом, пока пустые строки не кончатся.
 *
 * Отбор идёт по первичным ключам, а не `UPDATE ... LIMIT`: так пакет
 * читается и пишется явно, и это работает одинаково на любой базе.
 */
async function backfillOneTable(
  knex: any,
  table: string,
  legalEntityId: number,
): Promise<BackfillTableResult> {
  // Таблицы могло не быть: организации заводились в разное время, и модуль,
  // которого у них нет, таблицу не создавал.
  const exists = await knex.schema.hasTable(table);
  if (!exists) return { table, updated: 0, incomplete: false };

  let updated = 0;

  for (let batch = 0; batch < BACKFILL_MAX_BATCHES; batch += 1) {
    const rows: any[] = await knex(table)
      .select('id')
      .whereNull('legal_entity_id')
      .limit(BACKFILL_BATCH_SIZE);

    if (rows.length === 0) {
      return { table, updated, incomplete: false };
    }

    await knex(table)
      .whereIn(
        'id',
        rows.map((row) => row.id),
      )
      // Условие повторяется и здесь: между чтением пакета и записью строке
      // могли назначить юрлицо руками, и перезаписывать его нельзя.
      .whereNull('legal_entity_id')
      .update({ legal_entity_id: legalEntityId });

    updated += rows.length;
  }

  return { table, updated, incomplete: true };
}
