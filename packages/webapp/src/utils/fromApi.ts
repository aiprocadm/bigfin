// © 2026 Bigfin
/**
 * Ответ сервера — в том виде, в каком его читает новый код витрины.
 *
 * ЗАЧЕМ ЭТО НУЖНО. Сервер переводит КАЖДЫЙ ответ в змеиный вид: в коде
 * `netAssets`, наружу уходит `net_assets`. Это делает общий перехватчик
 * `SerializeInterceptor`, и обойти его нельзя.
 *
 * Прежние экраны писались под это и читают змеиные имена. Новые — писались
 * в верблюжьем стиле, и читают `data.hasFixedArticles` там, где приезжает
 * `has_fixed_articles`.
 *
 * Чем это опасно. Ошибка НЕ ПАДАЕТ. Поле просто оказывается `undefined`:
 *
 *   - на экране анализа расходов не рисовалась таблица статей вовсе
 *     (`topArticles` → `undefined` → `?.map` ничего не вернул), точка
 *     безубыточности всегда показывала «—», а доли — 0%;
 *   - в справочнике юрлиц не показывалась пометка «головное»
 *     (`isPrimary` → `undefined`), а форма правки теряла систему
 *     налогообложения.
 *
 * Тесты этого не ловят и поймать не могут: в них подделки отдают верблюжьи
 * имена, то есть повторяют ожидание кода, а не поведение сервера.
 *
 * ПОЧЕМУ НЕ ПЕРЕВОДИМ ГЛОБАЛЬНО. Прежние экраны читают змеиные имена
 * осознанно и их сотни. Глобальный перевод сломал бы их все разом. Поэтому
 * перевод стоит в `select` НОВЫХ выборок — там, где новый код и живёт.
 */

/** Одно имя: `net_assets` → `netAssets`. */
function keyToCamel(key: string): string {
  return key.replace(/[-_]([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

/**
 * Переводит имена полей ответа в верблюжий вид — вглубь, включая списки.
 *
 * Значения не трогаются вовсе: строка `some_value` останется собой. Меняются
 * только ИМЕНА полей.
 *
 * Даты (`Date`) и прочие непростые значения возвращаются как есть: обойти их
 * как обычный объект значило бы превратить дату в набор полей.
 */
export function fromApi<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => fromApi(item)) as unknown as T;
  }

  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;

  const result: Record<string, unknown> = {};

  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    result[keyToCamel(key)] = fromApi(item);
  });

  return result as unknown as T;
}
