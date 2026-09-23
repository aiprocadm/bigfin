// © 2026 Bigfin

/**
 * Ярусы управленческой прибыли (FT-010 ТЗ-3): чистая функция.
 *
 * Лестница: Выручка → Маржинальный доход → Валовая прибыль по направлениям
 * (ВП1) → Валовая прибыль общая (ВП2) → Операционная прибыль (EBITDA) →
 * Чистая прибыль. Под каждым ярусом — рентабельность: ярус / выручка.
 *
 * ВХОД — суммы по ярусам статей (`pl_type`), каждая ПОЛОЖИТЕЛЬНАЯ: выручка —
 * сколько заработали, расходы — сколько потратили. Знак расхода задаёт
 * формула, а не данные: иначе один перепутанный минус в данных превращал бы
 * расход в доход, и никто бы этого не заметил.
 *
 * РЕНТАБЕЛЬНОСТЬ ПРИ ВЫРУЧКЕ ≤ 0 НЕ СЧИТАЕТСЯ. «0 %» соврало бы, что
 * бизнес ничего не зарабатывает на рубль выручки, «+100 %» при минусе на
 * минус — что он сверхприбылен. Честный ответ — «не определено».
 */

export const MANAGERIAL_PL_TYPES = [
  'revenue',
  'direct_variable',
  'direct_production',
  'overhead_production',
  'administrative',
  'commercial',
  'other_income_below_ebitda',
  'below_ebitda',
  'below_net_profit',
] as const;

export type ManagerialPlType = (typeof MANAGERIAL_PL_TYPES)[number];

export type PlTypeAmounts = Partial<Record<ManagerialPlType, number>>;

export interface Margin {
  /** Процент, например 79.03. `null` — не определено. */
  value: number | null;
  applicable: boolean;
}

export interface ManagerialTiers {
  /** Маржинальный доход: выручка минус прямые переменные. */
  md: number;
  /** Валовая прибыль по направлениям. */
  gp1: number;
  /** Валовая прибыль общая. */
  gp2: number;
  /** Операционная прибыль (EBITDA). */
  op: number;
  /** Чистая прибыль. «Ниже чистой прибыли» на неё не влияет. */
  np: number;
  margins: { md: Margin; gp1: Margin; gp2: Margin; op: Margin; np: Margin };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Рентабельность яруса; выручка ≤ 0 — не определено. */
export function marginOf(tier: number, revenue: number): Margin {
  if (!(revenue > 0)) return { value: null, applicable: false };
  return { value: round2((tier / revenue) * 100), applicable: true };
}

export function computeManagerialTiers(amounts: PlTypeAmounts): ManagerialTiers {
  const get = (type: ManagerialPlType) => Number(amounts[type] ?? 0) || 0;

  const revenue = get('revenue');
  const md = round2(revenue - get('direct_variable'));
  const gp1 = round2(md - get('direct_production'));
  const gp2 = round2(gp1 - get('overhead_production'));
  const op = round2(gp2 - get('administrative') - get('commercial'));
  const np = round2(
    op + get('other_income_below_ebitda') - get('below_ebitda'),
  );

  return {
    md,
    gp1,
    gp2,
    op,
    np,
    margins: {
      md: marginOf(md, revenue),
      gp1: marginOf(gp1, revenue),
      gp2: marginOf(gp2, revenue),
      op: marginOf(op, revenue),
      np: marginOf(np, revenue),
    },
  };
}
