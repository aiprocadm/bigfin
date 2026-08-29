import { ServiceError } from '@/modules/Items/ServiceError';

/**
 * Настоящий потолок строк выгрузки. Раньше здесь стояло `EXPORT_SIZE_LIMIT =
 * 9999999` — не предел, а «бесконечность»: выгрузка большого раздела либо
 * съедала память, либо молча отдавала не всё.
 *
 * Правило продукта: данные не теряются молча. Поэтому одиночная выгрузка
 * честно отказывает и просит сузить отбор, а «выгрузить всё» пропускает
 * такой раздел и пишет причину в лист «Skipped» (М3 срез 4 карты v15).
 *
 * Значение можно переопределить переменной окружения `EXPORT_ROWS_LIMIT`.
 *
 * Н1 карты v38: окружение спрашивается в момент ОБРАЩЕНИЯ. Раньше значение
 * запоминалось на загрузке модуля — то есть до того, как `ConfigModule`
 * прочитает `.env`, — и настройка из `.env` молча не действовала.
 */
export function exportRowsLimit(): number {
  return Number(process.env.EXPORT_ROWS_LIMIT || 100000);
}

export enum ExportErrors {
  EXPORT_ROWS_LIMIT_EXCEEDED = 'EXPORT_ROWS_LIMIT_EXCEEDED',
}

/**
 * Влезает ли выгрузка в потолок.
 * @param {number} rowsCount - Сколько строк вышло.
 * @param {number} limit - Потолок; по умолчанию общий {@link exportRowsLimit}.
 */
export function isExportOverLimit(
  rowsCount: number,
  limit: number = exportRowsLimit(),
): boolean {
  return rowsCount > limit;
}

/**
 * Требует, чтобы выгрузка помещалась в потолок.
 * @param {number} rowsCount - Сколько строк вышло.
 * @param {string} resource - Что выгружаем: попадёт в текст на экране.
 * @param {number} limit - Потолок.
 * @throws {ServiceError} EXPORT_ROWS_LIMIT_EXCEEDED
 */
export function assertExportRowsWithinLimit(
  rowsCount: number,
  resource: string,
  limit: number = exportRowsLimit(),
): void {
  if (isExportOverLimit(rowsCount, limit)) {
    throw new ServiceError(
      ExportErrors.EXPORT_ROWS_LIMIT_EXCEEDED,
      'Выгрузка не помещается: сузьте отбор или выгрузите по частям.',
      { rowsCount, limit, resource },
    );
  }
}
