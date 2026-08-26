import { DEFAULT_VAT_BY_REGIME, TaxRegime } from './constants';

interface TaxRateLike {
  id: number | string;
  code?: string;
  active?: boolean | number;
}

/**
 * Н2 карты v22. Ставка НДС, которую продукт подставляет сам.
 *
 * Сопоставление «налоговый режим → ставка НДС» (`DEFAULT_VAT_BY_REGIME`)
 * лежало в коде с комментарием «определяет ставку при создании счетов» — и
 * не использовалось нигде. В итоге предприниматель на упрощёнке, который
 * НДС не платит вовсе, выбирал «Без НДС» руками в каждой строке каждого
 * документа, хотя продукт знал его режим.
 *
 * Правило простое: УСН, патент и АУСН — «Без НДС», общая система — 20 %.
 * Если режим не задан (организации других стран, старые организации) или
 * нужной ставки в справочнике нет — возвращаем пустую строку, и всё
 * остаётся как было: человек выбирает сам.
 */
export const resolveDefaultTaxRateId = (
  taxRates: TaxRateLike[] | undefined | null,
  taxRegime: string | undefined | null,
): string => {
  if (!taxRegime || !taxRates?.length) return '';

  const code = DEFAULT_VAT_BY_REGIME[taxRegime as TaxRegime];
  if (!code) return '';

  const match = taxRates.find(
    (rate) => rate.code === code && rate.active !== false && rate.active !== 0,
  );

  return match ? String(match.id) : '';
};
