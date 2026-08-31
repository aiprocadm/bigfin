// © 2026 Bigfin

/**
 * Карта v43. Номер записи, которую поиск просит открыть.
 *
 * Разделы, добавленные позже классических, открывают запись прямо на своей
 * странице, а не выдвижной карточкой. Поэтому поиск ведёт на страницу и
 * передаёт находку адресом: `/deals?open=12`.
 *
 * Мусор вместо номера считается отсутствием: иначе страница попыталась бы
 * открыть запись «NaN» и показала пустую карточку вместо списка.
 */
export function openIdFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get('open');

  if (!raw || !/^\d+$/.test(raw)) return null;

  const id = Number(raw);

  return id > 0 ? id : null;
}
