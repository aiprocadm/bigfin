/**
 * Блоки главной и их порядок (FT-064 ТЗ-3).
 *
 * Человек сам решает, какие блоки видеть и в каком порядке. Хранится это
 * в его личных настройках вида (`dashboardWidgets`): у каждого своя главная.
 *
 * Здесь только расчёт, без React: так это проверяется тестами.
 */
// Порядок по умолчанию (UI-047-1 ТЗ-4): лента денег → кольца плана →
// показатели периода и графики → подсказки ИИ. «Идём ли по плану?» — второй
// вопрос после «хватит ли денег», поэтому план сразу за лентой.
export const HOMEPAGE_WIDGETS = [
  'cash_timeline',
  'plan',
  'overview',
  'ai_insights',
  'shares',
  'money_summary',
  'first_steps',
  'quick_links',
] as const;

export type HomepageWidgetId = (typeof HOMEPAGE_WIDGETS)[number];

/**
 * Порядок блоков с учётом сохранённого.
 *
 * ДВА ПРАВИЛА, ОБА — ПРО ТО, ЧТО ПРОДУКТ МЕНЯЕТСЯ, А НАСТРОЙКА ЛЕЖИТ.
 *
 * 1. Незнакомые имена в сохранённом порядке молча отбрасываются. Блок
 *    убрали из продукта — его имя остаётся в настройке навсегда, и рисовать
 *    на его месте нечего.
 * 2. Блок, которого нет в сохранённом порядке (его добавили в продукт уже
 *    после того, как человек настроил главную), не пропадает, а встаёт на
 *    своё обычное место: сразу за тем блоком, за которым он стоит по
 *    умолчанию. Если перед ним по умолчанию никого нет — в самое начало.
 *
 * Повторы в сохранённом порядке считаются один раз — по первому вхождению.
 */
export function orderWidgets<T extends string>(
  defaults: readonly T[],
  saved: readonly string[] | null | undefined,
): T[] {
  const known = new Set<string>(defaults);
  const result: T[] = [];

  (saved ?? []).forEach((id) => {
    if (known.has(id) && !result.includes(id as T)) result.push(id as T);
  });

  defaults.forEach((id, index) => {
    if (result.includes(id)) return;

    // Ближайший предшественник по умолчанию, который уже стоит в списке.
    let position = 0;
    for (let prev = index - 1; prev >= 0; prev -= 1) {
      const at = result.indexOf(defaults[prev]);
      if (at !== -1) {
        position = at + 1;
        break;
      }
    }
    result.splice(position, 0, id);
  });

  return result;
}

/** Видимые блоки в нужном порядке. Незнакомые скрытые имена ни на что не влияют. */
export function visibleWidgets<T extends string>(
  ordered: readonly T[],
  hidden: readonly string[] | null | undefined,
): T[] {
  const skip = new Set(hidden ?? []);
  return ordered.filter((id) => !skip.has(id));
}

/** Одинаковы ли два порядка — чтобы не сохранять то, что не менялось. */
export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
