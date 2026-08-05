import { Knex } from 'knex';

/**
 * Пакетная вставка строк на MySQL.
 *
 * Objection умеет `query().insert(массив)` только в PostgreSQL и SQL Server —
 * на MySQL он падает с «batch insert only works with Postgresql and SQL
 * Server». Из-за этого не создавался кредит (график платежей) и падала
 * отметка «прочитать все уведомления». Knex мультивставку собирает, поэтому
 * пишем через него.
 *
 * Отметки времени проставляем сами: в обход модели её хуки не срабатывают.
 */
export interface InsertManyOptions {
  /** Колонки уникального ключа — для поведения при конфликте. */
  onConflict?: string[];
  /** Что делать при конфликте: пропустить строку или обновить перечисленные поля. */
  conflict?: 'ignore' | string[];
  /** Проставлять createdAt/updatedAt (по умолчанию да). */
  timestamps?: boolean;
}

export async function insertMany<T extends Record<string, any>>(
  trx: Knex | Knex.Transaction,
  tableName: string,
  rows: T[],
  options: InsertManyOptions = {},
): Promise<number> {
  if (!rows?.length) return 0;

  const { onConflict, conflict, timestamps = true } = options;
  const now = new Date();
  const prepared = timestamps
    ? rows.map((row) => ({ createdAt: now, updatedAt: now, ...row }))
    : rows;

  const query = trx(tableName).insert(prepared as any);

  if (onConflict?.length) {
    const conflicting = query.onConflict(onConflict as any);
    await (conflict === 'ignore' || !conflict
      ? conflicting.ignore()
      : conflicting.merge(conflict as any));
  } else {
    await query;
  }
  return rows.length;
}
