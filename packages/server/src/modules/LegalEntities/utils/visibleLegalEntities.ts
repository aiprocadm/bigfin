// © 2026 Bigfin
/**
 * Кому какие юрлица видно (этап 8 ТЗ, §8.4).
 *
 * «Бухгалтеру ИП видно только ИП, владельцу — всё». Ошибка здесь — это
 * показанные чужие деньги, поэтому правило вынесено отдельно и проверяется
 * само по себе, а не только через отчёты.
 */

export interface LegalEntityAccess {
  /**
   * Юрлица, к которым допущен пользователь.
   * Пусто или не задано = допущен ко всем (владелец, администратор).
   */
  allowedLegalEntityIds?: number[] | null;
}

/**
 * Пересекает запрошенные юрлица с разрешёнными.
 *
 * Три случая:
 * 1. Ограничения нет — отдаём запрошенное как есть.
 * 2. Ограничение есть, запроса нет — отдаём разрешённые. Это важнее, чем
 *    кажется: «все юрлица» для ограниченного пользователя означает «все
 *    ЕГО юрлица», а не все вообще.
 * 3. Ограничение есть и запрос есть — пересечение. Запрос чужого юрлица
 *    не расширяет доступ, он просто ничего не добавляет.
 */
export function visibleLegalEntityIds(
  requested: number[] | null | undefined,
  access: LegalEntityAccess | undefined,
): number[] {
  const allowed = (access?.allowedLegalEntityIds ?? []).map(Number);
  const asked = (requested ?? []).map(Number);

  if (allowed.length === 0) return asked;
  if (asked.length === 0) return allowed;

  const allowedSet = new Set(allowed);
  return asked.filter((id) => allowedSet.has(id));
}

/**
 * Попытка посмотреть чужое юрлицо.
 *
 * Такой запрос не должен молча превращаться в пустой отчёт: человек решит,
 * что у юрлица нет операций, и будет неправ. Вызывающий показывает отказ.
 */
export function requestsForbiddenLegalEntity(
  requested: number[] | null | undefined,
  access: LegalEntityAccess | undefined,
): boolean {
  const allowed = (access?.allowedLegalEntityIds ?? []).map(Number);
  const asked = (requested ?? []).map(Number);

  if (allowed.length === 0 || asked.length === 0) return false;

  const allowedSet = new Set(allowed);
  return asked.some((id) => !allowedSet.has(id));
}
