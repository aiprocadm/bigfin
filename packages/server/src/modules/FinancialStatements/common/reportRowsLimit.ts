import { ServiceError } from '@/modules/Items/ServiceError';

/**
 * Потолок строк для отчётов, которые собираются в памяти (Главная книга,
 * Журнал). Раньше потолка не было вовсе: отчёт за большой период тянул все
 * проводки разом и отвечал минуту или падал.
 *
 * Молча обрезать нельзя — обрезанная Главная книга не сходится и выглядит
 * как ошибка учёта. Поэтому предохранитель отказывает и просит сузить
 * период (М3 срез 3 карты v15).
 *
 * Значение можно переопределить переменной окружения `reportRowsLimit()`
 * на случай, если у клиента машина мощнее.
 *
 * Н1 карты v38: окружение спрашивается в момент ОБРАЩЕНИЯ. Раньше значение
 * запоминалось на загрузке модуля — то есть до того, как `ConfigModule`
 * прочитает `.env`, — и настройка из `.env` молча не действовала.
 */
export function reportRowsLimit(): number {
  return Number(process.env.REPORT_ROWS_LIMIT || 50000);
}

export enum ReportErrors {
  REPORT_ROWS_LIMIT_EXCEEDED = 'REPORT_ROWS_LIMIT_EXCEEDED',
}

/**
 * Проверяет, что отчёт помещается в потолок строк.
 * @param {number} rowsCount - Сколько строк даст отчёт.
 * @param {number} limit - Потолок; по умолчанию общий {@link reportRowsLimit}.
 * @throws {ServiceError} REPORT_ROWS_LIMIT_EXCEEDED
 */
export function assertReportRowsWithinLimit(
  rowsCount: number,
  limit: number = reportRowsLimit(),
): void {
  if (rowsCount > limit) {
    throw new ServiceError(
      ReportErrors.REPORT_ROWS_LIMIT_EXCEEDED,
      'Отчёт не помещается: сузьте период или выберите меньше счетов.',
      { rowsCount, limit },
    );
  }
}
