// © 2026 Bigfin
/**
 * Разбивка НДС по ставкам (шаг Д5 карты v6).
 *
 * Зачем. Для декларации нужна не общая сумма налога, а разбивка по ставкам:
 * сколько начислено по 20 %, сколько по 10 %, сколько продано по ставке 0 %
 * (экспорт) и сколько — вообще без НДС. Раньше страница «Анализ НДС»
 * показывала одну и ту же пару цифр в плитках и в таблице.
 *
 * Откуда данные. Всё берётся из журнала: строки документов несут ставку
 * налога. При этом важны ДВА вида строк:
 * - строка налога (счёт «Налоги к уплате» / «НДС к вычету») — сам налог;
 * - строка выручки или закупки — налоговая база по этой ставке.
 *
 * Без строк базы ставка 0 % не видна вовсе: налога по ней нет, значит нет и
 * налоговой строки. Именно поэтому «0 %» и «без НДС» раньше были неразличимы.
 */

/** Куда отнести движение: это налог или база, продажи или закупки. */
export type VatBucket =
  | 'chargedTax'
  | 'deductibleTax'
  | 'salesBase'
  | 'purchaseBase';

/** Сгруппированное движение журнала по одной ставке. */
export interface VatRateLedgerRow {
  taxRateId: number;
  bucket: VatBucket;
  credit: number;
  debit: number;
}

/** Справочные данные ставки. */
export interface VatRateInfo {
  id: number;
  name: string;
  code: string;
  rate: number;
}

/** Строка разбивки по одной ставке налога. */
export interface VatByRate {
  taxRateId: number;
  name: string;
  code: string;
  rate: number;
  /** Налоговая база по продажам (выручка без налога). */
  salesBase: number;
  /** Начисленный налог с продаж. */
  charged: number;
  /** Налоговая база по закупкам. */
  purchaseBase: number;
  /** Налог, принимаемый к вычету. */
  deductible: number;
}

const positive = (value: number): number => (value > 0 ? value : 0);

/**
 * Считает разбивку по ставкам.
 *
 * Каждое ведро сворачивается «в свою сторону»: продажи и начисленный налог
 * растут кредитом и уменьшаются дебетом (возврат покупателю), закупки и
 * вычет — наоборот. Отрицательных итогов не показываем: возвратов больше,
 * чем продаж за период, — это не «минус база», а ноль.
 *
 * Строки без известной ставки отбрасываются: показать их не под чем.
 */
export const computeVatByRate = (
  rows: VatRateLedgerRow[],
  rates: VatRateInfo[],
): VatByRate[] => {
  const rateById = new Map<number, VatRateInfo>(rates.map((r) => [r.id, r]));
  const netByRate = new Map<number, Record<VatBucket, number>>();

  rows.forEach((row) => {
    if (!rateById.has(row.taxRateId)) return;

    const current =
      netByRate.get(row.taxRateId) ??
      ({
        chargedTax: 0,
        deductibleTax: 0,
        salesBase: 0,
        purchaseBase: 0,
      } as Record<VatBucket, number>);

    const isSalesSide =
      row.bucket === 'chargedTax' || row.bucket === 'salesBase';
    const delta = isSalesSide
      ? (row.credit || 0) - (row.debit || 0)
      : (row.debit || 0) - (row.credit || 0);

    current[row.bucket] += delta;
    netByRate.set(row.taxRateId, current);
  });

  return Array.from(netByRate.entries())
    .map(([taxRateId, sums]) => {
      const info = rateById.get(taxRateId) as VatRateInfo;
      return {
        taxRateId,
        name: info.name,
        code: info.code,
        rate: Number(info.rate) || 0,
        salesBase: positive(sums.salesBase),
        charged: positive(sums.chargedTax),
        purchaseBase: positive(sums.purchaseBase),
        deductible: positive(sums.deductibleTax),
      };
    })
    .filter(
      (r) =>
        r.salesBase > 0 || r.charged > 0 || r.purchaseBase > 0 || r.deductible > 0,
    )
    // От большей ставки к меньшей. У «0 %» и «без НДС» ставка одинаковая,
    // поэтому вторым ключом идёт код: облагаемая по нулю ставка выше, чем
    // операции вне НДС.
    .sort((a, b) => b.rate - a.rate || a.code.localeCompare(b.code));
};
