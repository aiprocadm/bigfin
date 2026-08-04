/**
 * Псевдонимы полей ответа в camelCase.
 *
 * Сервер отдаёт ответы в snake_case (`overdue_total`, `planned_amount`),
 * а страницы сплошь и рядом читают их в camelCase — и получают `undefined`.
 * Это оказалось главным источником дефектов приёмки: нули вместо сумм, пустые
 * имена, неоткрывающиеся блоки и даже падение страницы на `undefined`.
 *
 * Здесь мы НЕ переименовываем поля, а ДОБАВЛЯЕМ рядом camelCase-псевдоним
 * с тем же значением. Исходные ключи остаются на месте, поэтому код, который
 * уже читает snake_case, продолжает работать без единой правки.
 *
 * Объекты меняются на месте: ответы бывают большими (отчёты — тысячи строк),
 * и лишнее копирование здесь ни к чему.
 */

/**
 * Ответы, где ключи объекта — сами данные, а не имена полей структуры.
 *
 * Метаданные ресурса устроены как словарь «имя поля → описание поля»
 * (`invoice_date`, `due_date`, …). Псевдонимы добавили бы туда вторые
 * экземпляры тех же полей, и в конструкторе фильтров и представлений они
 * задвоились бы. Такие ответы обходим стороной.
 */
const DATA_KEYED_RESPONSES = [/\/resources\/[^/]+\/meta\/?$/];

export const shouldAliasResponse = (url?: string): boolean =>
  !DATA_KEYED_RESPONSES.some((pattern) => pattern.test(url ?? ''));

/** Строгий snake_case: буквы/цифры и хотя бы одно подчёркивание внутри. */
const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;

const toCamelCase = (key: string): string =>
  key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/**
 * Простой объект — только его поля имеет смысл дополнять. Date, File, Blob
 * и прочие «умные» объекты трогать нельзя: у них своё поведение.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export function withCamelAliases<T>(value: T, seen = new WeakSet()): T {
  if (Array.isArray(value)) {
    // Ссылки на уже пройденные узлы пропускаем — иначе зациклимся.
    if (seen.has(value as unknown as object)) return value;
    seen.add(value as unknown as object);

    for (const item of value) withCamelAliases(item, seen);
    return value;
  }

  if (!isPlainObject(value)) return value;
  if (seen.has(value)) return value;
  seen.add(value);

  const record = value as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    withCamelAliases(record[key], seen);

    if (!SNAKE_CASE.test(key)) continue;

    const camelKey = toCamelCase(key);
    // Если сервер прислал оба варианта — его значение важнее нашего псевдонима.
    if (camelKey !== key && !(camelKey in record)) {
      record[camelKey] = record[key];
    }
  }
  return value;
}
