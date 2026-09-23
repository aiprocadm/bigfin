// © 2026 Bigfin
import intl from 'react-intl-universal';

/**
 * Ярус статьи в управленческом отчёте о прибыли (FT-009 ТЗ-3) — сторона
 * экрана.
 *
 * Здесь только то, что нужно форме и подписям: какие ярусы предложить при
 * каком виде статьи и как их назвать. ДЕЙСТВУЮЩИЙ ярус (с наследованием от
 * родителя) экран не вычисляет — его присылает сервер, где правило живёт в
 * одном месте. Списки ниже — копия серверных; за совпадением следит
 * `plTypesParity.spec.ts`.
 */
export const INCOME_PL_TYPES = ['revenue', 'other_income_below_ebitda'] as const;

export const EXPENSE_PL_TYPES = [
  'direct_variable',
  'direct_production',
  'overhead_production',
  'administrative',
  'commercial',
  'below_ebitda',
  'below_net_profit',
] as const;

export const PL_TYPE_EXCLUDED = 'excluded' as const;

export const PL_TYPES = [
  ...INCOME_PL_TYPES,
  ...EXPENSE_PL_TYPES,
  PL_TYPE_EXCLUDED,
] as const;

export type PlType = (typeof PL_TYPES)[number];

/** Ярусы, которые можно выбрать при этом виде статьи; пусто — ярусов нет. */
export function plTypeOptions(kind: string | undefined): PlType[] {
  if (kind === 'income') return [...INCOME_PL_TYPES, PL_TYPE_EXCLUDED];
  if (kind === 'expense') return [...EXPENSE_PL_TYPES, PL_TYPE_EXCLUDED];
  return [];
}

export function isPlType(value: unknown): value is PlType {
  return (PL_TYPES as readonly unknown[]).includes(value);
}

/** Название яруса: «Прямые переменные». */
export function plTypeLabel(plType: PlType): string {
  return intl.get(`management_articles.pl_type.${plType}`) || plType;
}

/** Что ярус делает с прибылью: «уменьшает маржинальный доход». */
export function plTypeEffect(plType: PlType): string {
  return intl.get(`management_articles.pl_type_effect.${plType}`) || '';
}

export interface TierDescription {
  /** Ярус не задан ни у статьи, ни у предков. */
  unassigned: boolean;
  /** Ярус взят у родителя. */
  inherited: boolean;
  /** Короткое имя для бейджа; у незаданного — «Не отнесено к ярусу». */
  label: string;
  /** Полная строка схемы: «Прямые переменные → уменьшает маржинальный доход». */
  sentence: string;
}

/**
 * Подпись яруса для бейджа и схемы «Куда попадает».
 *
 * Незаданный ярус подписан словами, а не пустотой: у такой статьи деньги
 * встанут в отчёте строкой «Не отнесено к ярусу», и человек должен узнать об
 * этом в справочнике, а не в отчёте через месяц.
 */
export function describeTier(
  plType: string | null | undefined,
  inherited: boolean | undefined,
): TierDescription {
  if (!isPlType(plType)) {
    const label = intl.get('management_articles.pl_type_unassigned');
    return {
      unassigned: true,
      inherited: false,
      label,
      sentence: `${label} → ${intl.get(
        'management_articles.pl_type_effect.unassigned',
      )}`,
    };
  }

  const label = plTypeLabel(plType);
  return {
    unassigned: false,
    inherited: Boolean(inherited),
    label,
    sentence: `${label} → ${plTypeEffect(plType)}`,
  };
}
