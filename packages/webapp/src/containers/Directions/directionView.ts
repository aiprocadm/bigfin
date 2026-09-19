// © 2026 Bigfin

export const DIRECTION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export interface ProjectRow {
  id: number;
  name: string;
  status: string;
  contactId: number | null;
  deadline: string | null;
  costEstimate: number | null;
  /** Сколько операций уже отнесено на направление. */
  transactionsCount: number;
}

/**
 * Направление действует, то есть предлагается в новых операциях.
 *
 * Пустой статус считается действующим: направления, заведённые до появления
 * статуса, не должны молча исчезнуть из выбора.
 */
export function isDirectionActive(direction: ProjectRow): boolean {
  return direction.status !== DIRECTION_STATUS.ARCHIVED;
}

/**
 * Можно ли удалить направление.
 *
 * НАПРАВЛЕНИЕ С ОПЕРАЦИЯМИ УДАЛИТЬ НЕЛЬЗЯ: прошлые операции остались бы со
 * ссылкой в никуда — отчёт по направлению показал бы пустоту, а деньги были
 * потрачены. Кнопку прячем там, где сервер всё равно откажет: предлагать
 * действие, которое не выполнится, хуже, чем не предлагать вовсе.
 */
export function canDeleteDirection(direction: ProjectRow): boolean {
  return (direction.transactionsCount ?? 0) === 0;
}

/**
 * Показывать ли разрез по направлениям в других разделах.
 *
 * Правило то же, что у юрлиц: пока направление одно (или их нет вовсе),
 * колонка и отбор ничего не сообщают — это столбец с одним словом в каждой
 * строке.
 */
export function shouldShowDirectionBreakdown(
  directions: ProjectRow[] | undefined,
): boolean {
  return (directions ?? []).filter(isDirectionActive).length > 1;
}
