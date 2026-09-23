// © 2026 Bigfin
import { SetMetadata } from '@nestjs/common';
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

export const NOT_DATA_EXPORT_KEY = 'notDataExport';

/**
 * Пометка «таблица, но не выгрузка данных»: ручка отдаёт Excel/CSV, в котором
 * нет ничего из базы организации (например, пустой образец для импорта с
 * придуманными строками). Право «Выгрузка данных» для неё не нужно.
 */
export const NotDataExport = () => SetMetadata(NOT_DATA_EXPORT_KEY, true);
