import { get } from 'lodash';
import { IColumnMapperMeta, ITableRow } from '../types/Table.types';

export function tableMapper(
  data: Object[],
  columns: IColumnMapperMeta[],
  rowsMeta
): ITableRow[] {
  return data.map((object) => tableRowMapper(object, columns, rowsMeta));
}

function getAccessor(object, accessor) {
  return typeof accessor === 'function'
    ? accessor(object)
    : get(object, accessor);
}

export function tableRowMapper(
  object: Object,
  columns: IColumnMapperMeta[],
  rowMeta
): ITableRow {
  const cells = columns.map((column) => ({
    key: column.key,
    value: column.value
      ? column.value
      : getAccessor(object, column.accessor) || '',
  }));

  return {
    cells,
    ...rowMeta,
  };
}

/**
 * Приводит список, собранный через `R.pipe`/`R.when` из ramda, к обычному
 * массиву.
 *
 * Зачем нужно. `R.when(условие, R.append(x))` по своим типам возвращает
 * `T[] | readonly T[]`: ramda не берётся утверждать, что вернёт именно
 * изменяемый массив. Подписи же у построителей колонок обещают `ITableColumn[]`,
 * и без приведения проверка типов не сходится в шести файлах отчётов.
 *
 * Делается КОПИЯ, а не приведение типа. Приведением можно было бы обойтись
 * одной строкой, но тогда вызывающий получил бы право дописывать в список,
 * который ramda имеет право вернуть общим для нескольких веток, — и правка
 * колонок одного отчёта отозвалась бы в другом.
 */
export function toMutableList<T>(items: readonly T[] | T[]): T[] {
  return [...items];
}

/**
 * Вид узла после цепочки `R.compose`/`R.when`, которая ТОЛЬКО дописывает ему
 * поля, не меняя самого вида.
 *
 * Зачем нужно. ramda не умеет пронести вид узла через такую цепочку: каждый
 * `R.when` добавляет ветку «а вдруг вернули то же, что пришло», и на выходе
 * получается объединение или вовсе «неизвестно». Поэтому вид объявляется
 * здесь явно.
 *
 * Утверждение проверяемо глазами: все шаги этих цепочек — `R.assoc` и ему
 * подобные, то есть дописывание полей ТОМУ ЖЕ узлу. Если однажды в цепочку
 * добавят шаг, который меняет вид узла, это правило перестанет быть верным —
 * и тогда помощник надо убирать, а не расширять.
 */
export function sameNodeShape<T>(node: unknown): T {
  return node as T;
}
