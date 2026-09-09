// © 2026 Bigfin
import type { Cell, ColumnInstance, Row } from 'react-table';

/**
 * Свойства рисователя ячейки таблицы.
 *
 * `payload` — свой канал `Datatable`: через него экран передаёт ячейке свои
 * обработчики (`removeRow`, `currencyCode` и прочее). В готовых типах
 * `react-table` его нет, потому что это наша добавка.
 *
 * Таких рисователей в витрине **121 штука**, и объявления свойств не было ни у
 * одного — каждый держал свой файл под пометкой «не проверять типы»
 * (Д4 карты v81). Тип объявлен здесь, чтобы следующие разборы его брали, а не
 * повторяли форму заново.
 *
 * Все поля необязательные: рисователь разбирает только то, что ему нужно.
 */
export interface TableCellRendererProps<TPayload = any, TValue = any> {
  row?: Row<any>;
  column?: ColumnInstance<any>;
  cell?: Cell<any>;
  value?: TValue;
  payload?: TPayload;
}
