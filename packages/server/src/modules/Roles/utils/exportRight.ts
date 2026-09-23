// © 2026 Bigfin
import { AcceptType } from '@/constants/accept-type';

/**
 * Просит ли запрос данные таблицей (FT-082 ТЗ-3).
 *
 * Отчёты отдают Excel и CSV той же ручкой, что и экран, — по заголовку
 * `Accept`. Поэтому право «Выгрузка данных» проверяется по заголовку, а не
 * по адресу: иначе его пришлось бы вписывать в каждый отчёт, и новый отчёт
 * открыл бы выгрузку молча.
 *
 * PDF сюда не входит намеренно: печатная форма — это документ для клиента
 * или на подпись, а не унос базы. Её закрывает право на просмотр.
 */
export function asksForSpreadsheet(accept: string | string[] | undefined): boolean {
  const value = Array.isArray(accept) ? accept.join(',') : accept || '';
  return (
    value.includes(AcceptType.ApplicationXlsx) ||
    value.includes(AcceptType.ApplicationCsv)
  );
}

export const EXPORT_NOT_ALLOWED_MESSAGE =
  'Нет права на выгрузку данных. Его выдаёт владелец в настройках роли.';
