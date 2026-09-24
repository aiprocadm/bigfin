/**
 * Доля в выручке против своей цели (FT-065 ТЗ-3).
 *
 * Здесь только расчёт, без React: так это проверяется тестами.
 */
export type ShareStatus =
  /** Выручки нет — доли нет, и процент от нуля не печатается никогда. */
  | { kind: 'no_revenue' }
  /** Цель не задана — показываем долю без оценки. */
  | { kind: 'no_target' }
  /** Доля не выше цели. */
  | { kind: 'within' }
  /** Доля выше цели на `by` процентных пунктов. */
  | { kind: 'over'; by: number };

export function shareStatus(
  share: number | null | undefined,
  target: number | null | undefined,
): ShareStatus {
  if (typeof share !== 'number' || !Number.isFinite(share)) {
    return { kind: 'no_revenue' };
  }
  if (typeof target !== 'number' || !Number.isFinite(target)) {
    return { kind: 'no_target' };
  }
  // Сравниваем с точностью до десятой — так доля и печатается. Иначе
  // «35 % при цели 35 %» могло бы подсветиться из-за сотых, которых не видно.
  const by = Math.round((share - target) * 10) / 10;
  return by > 0 ? { kind: 'over', by } : { kind: 'within' };
}

/**
 * Цель из поля ввода: пусто — цели нет. Отрицательное число и мусор —
 * тоже «нет цели»: доля в выручке меньше нуля не бывает, и такая цель
 * подсвечивала бы любое значение.
 */
export function parseTarget(value: number | undefined | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 10) / 10;
}
