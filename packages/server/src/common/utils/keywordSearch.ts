// © 2026 Bigfin
/**
 * Минимум, который нужен помощнику от строителя запроса. Узкий тип нарочно:
 * списки разделов строятся и на Objection, и на голом Knex — общий помощник
 * не должен выбирать за них библиотеку.
 */
interface KeywordSearchWhere {
  orWhere(column: string, operator: string, value: string): unknown;
}

interface KeywordSearchBuilder {
  where(callback: (builder: KeywordSearchWhere) => void): unknown;
}

/**
 * Р1 карты v43. Общий поиск по ключевому слову для списка раздела.
 *
 * Разделы, добавленные позже классических (сделки, заявки на оплату,
 * основные средства и соседи), написаны простыми запросами — машинерии
 * `DynamicListing` у них нет. Чтобы поиск у них был одинаковым, а не своей
 * выдумкой в каждом, условие строит один помощник.
 */
export function applyKeywordSearch(
  builder: KeywordSearchBuilder,
  columns: string[],
  keyword?: string | null,
): void {
  const needle = (keyword ?? '').trim();

  if (!needle || columns.length === 0) return;

  const pattern = `%${escapeLikeWildcards(needle)}%`;

  // Скобки обязательны: без них «или» из поиска склеится с фильтром по
  // статусу, и раздел покажет чужие записи.
  builder.where((where) => {
    columns.forEach((column) => {
      where.orWhere(column, 'like', pattern);
    });
  });
}

/**
 * Знаки подстановки внутри запроса ищутся как обычные буквы: иначе «100%»
 * превращается в «найди всё», а «_» — в «любой символ».
 */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
