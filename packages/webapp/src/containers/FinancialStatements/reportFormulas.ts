import intl from 'react-intl-universal';

/**
 * Подсказки-формулы у расчётных строк отчётов (FT-016 ТЗ-3).
 *
 * ЗАЧЕМ. «Валовая прибыль по направлениям» — не очевидное понятие для
 * человека без бухгалтерского образования. Рядом со строкой — «?»: формула и
 * одно предложение смысла. Число, которое нельзя объяснить, перестают
 * читать.
 *
 * СПИСОК ОДИН НА ОБА ОТЧЁТА. Сторож `formulaTooltipsExist.spec.ts` сверяет
 * его с тем, какие итоги строит сервер: новый ярус без подсказки не пройдёт.
 */
export const REPORT_FORMULA_ROWS = {
  /** Управленческий ОПиУ: итоги ярусов и их рентабельность. */
  managerialPnl: [
    'md',
    'md_margin',
    'gp1',
    'gp1_margin',
    'gp2',
    'gp2_margin',
    'op',
    'op_margin',
    'np',
    'np_margin',
  ],
  /** «Деньги по статьям»: строки, которые считаются, а не складываются. */
  cashFlowArticles: ['net', 'closing', 'unclassified'],
} as const;

const ALL_FORMULA_ROWS = new Set<string>([
  ...REPORT_FORMULA_ROWS.managerialPnl,
  ...REPORT_FORMULA_ROWS.cashFlowArticles,
]);

/** Ключ подсказки строки: `reports.formula.<ключ строки>`. */
export const formulaKeyOf = (rowId: string): string => `reports.formula.${rowId}`;

/** Текст подсказки строки или `undefined`, если строка не расчётная. */
export function formulaHintOf(rowId: string | number | undefined): string | undefined {
  const id = String(rowId ?? '');
  if (!ALL_FORMULA_ROWS.has(id)) return undefined;
  return intl.get(formulaKeyOf(id)) || undefined;
}
