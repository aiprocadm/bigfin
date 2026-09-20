/**
 * Состав колонок реестра операций (T-34 ТЗ-2).
 *
 * ЗАЧЕМ. На экране «Операции» восемь колонок, а человеку обычно нужны три.
 * На телефоне остальные просто обрезаются, на широком экране — отвлекают.
 *
 * «ДАТА» И «СУММА» НЕ СНИМАЮТСЯ. Это требование ТЗ, и оно не про вкусы:
 * список операций без даты и суммы перестаёт быть списком операций. Снять
 * их — значит получить экран, на котором нечего читать, и решить, что
 * продукт сломался.
 *
 * ЭКСПОРТ ВСЕГДА ПОЛНЫЙ. Скрытая колонка — это про экран, а не про данные.
 * Выгрузив файл без колонки, человек обнаружит пропажу уже в Excel, когда
 * чинить поздно.
 */
export interface RegistryColumnsState {
  [columnId: string]: boolean;
}

/** Колонки, которые нельзя снять. */
export const REQUIRED_COLUMNS = ['date', 'amount'];

/** Колонки, которыми можно управлять, в порядке показа. */
export const OPTIONAL_COLUMNS = [
  'contact',
  'note',
  'type',
  'state',
  'account',
];

export const DEFAULT_REGISTRY_COLUMNS: RegistryColumnsState = {
  contact: true,
  note: true,
  type: true,
  state: true,
  account: true,
};

/**
 * Можно ли снять колонку.
 *
 * @param {string} columnId номер колонки
 * @returns {boolean}
 */
export function isColumnRemovable(columnId: string): boolean {
  return !REQUIRED_COLUMNS.includes(columnId);
}

/**
 * Переключает колонку.
 *
 * Обязательная колонка не переключается вовсе: возвращается прежнее
 * состояние. Молча «переключить и тут же вернуть» нельзя — галочка
 * мигнула бы, и человек решил бы, что продукт его не слушает.
 *
 * @param {RegistryColumnsState} columns текущее состояние
 * @param {string} columnId номер колонки
 * @returns {RegistryColumnsState}
 */
export function toggleRegistryColumn(
  columns: RegistryColumnsState,
  columnId: string,
): RegistryColumnsState {
  if (!isColumnRemovable(columnId)) return columns;

  return { ...columns, [columnId]: !columns[columnId] };
}

/**
 * Оставляет только видимые колонки.
 *
 * Обязательные проходят всегда, даже если в сохранённых настройках их
 * кто-то выключил: настройка из будущей версии не должна ломать экран.
 *
 * @param {Array<{ id: string }>} columns все колонки таблицы
 * @param {RegistryColumnsState} visible состояние видимости
 * @returns {Array<{ id: string }>}
 */
export function visibleRegistryColumns<T extends { id: string }>(
  columns: T[],
  visible: RegistryColumnsState,
): T[] {
  return (columns ?? []).filter((column) => {
    if (!isColumnRemovable(column.id)) return true;
    // Колонка, о которой настройка ничего не знает (новая), показывается:
    // молчание — это «не выбирал», а не «выключил».
    if (visible?.[column.id] === undefined) return true;

    return Boolean(visible[column.id]);
  });
}
