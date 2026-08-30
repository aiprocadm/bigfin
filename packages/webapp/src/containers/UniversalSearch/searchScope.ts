/**
 * С3 карты v39. Поиск говорит, среди чего он ищет.
 *
 * Подпись в шапке обещала «Поиск по контрагентам, счетам…» — человек читал
 * это как «ищу везде». На деле поиск смотрит один вид записей за раз, и
 * «Ничего не найдено» на экране счетов при вводе имени клиента означало
 * не «такого клиента нет», а «среди счетов имя клиента не ищется».
 *
 * Отсюда общий помощник: назвать выбранный вид записей человеческим
 * словом — им подписан и поиск в шапке, и пустой ответ.
 */
export interface SearchTypeOption {
  key: string;
  label: string;
}

export function searchScopeLabel(
  options: SearchTypeOption[] | undefined | null,
  type: string | undefined | null,
): string {
  if (!options?.length || !type) return '';

  return options.find((option) => option.key === type)?.label ?? '';
}
