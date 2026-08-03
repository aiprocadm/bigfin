import { MarketplaceSummary } from '../../types';

/** Безопасное число: нечисло/пусто → 0. */
const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Классификация услуг Ozon по названию. Ozon отдаёт десятки кодов вида
 * `MarketplaceServiceItem*`; нам важны три статьи, остальное всё равно
 * попадает в общие удержания (выручка − к перечислению).
 *
 * ⚠️ Список кодов СВЕРИТЬ с документацией продавца при подключении:
 * Ozon добавляет новые услуги, и попадание в «прочее» не искажает итог,
 * но делает разбивку менее точной.
 */
const STORAGE_MARKERS = ['storage'];
const LOGISTICS_MARKERS = ['deliv', 'return', 'logistic', 'pickup'];
const PENALTY_MARKERS = ['fine', 'penalt', 'claim'];

const matches = (name: string, markers: string[]): boolean =>
  markers.some((m) => name.includes(m));

/**
 * Чистая агрегация операций Ozon (`v3/finance/transaction/list`) в сводку.
 *
 * Поля Ozon: `accruals_for_sale` (начислено за продажу), `amount` (итог
 * операции — то, что дойдёт до продавца), `sale_commission` (комиссия),
 * `delivery_charge` / `return_delivery_charge` (доставка), `services[]`
 * (прочие услуги: хранение, штрафы, обработка). Удержания приходят
 * отрицательными числами — в сводке показываем их по модулю.
 */
export const aggregateOzonOperations = (
  operations: any[],
): MarketplaceSummary => {
  let revenue = 0;
  let toPay = 0;
  let logistics = 0;
  let penalties = 0;
  let storage = 0;

  for (const op of operations ?? []) {
    revenue += num(op?.accruals_for_sale);
    toPay += num(op?.amount);

    logistics +=
      Math.abs(num(op?.delivery_charge)) +
      Math.abs(num(op?.return_delivery_charge));

    for (const service of op?.services ?? []) {
      const name = String(service?.name ?? '').toLowerCase();
      const price = Math.abs(num(service?.price));

      if (matches(name, STORAGE_MARKERS)) storage += price;
      else if (matches(name, PENALTY_MARKERS)) penalties += price;
      else if (matches(name, LOGISTICS_MARKERS)) logistics += price;
      // Прочие услуги отдельной статьи не имеют: они уже учтены
      // в разнице «выручка − к перечислению».
    }
  }

  return {
    revenue,
    toPay,
    deductions: revenue - toPay,
    logistics,
    penalties,
    storage,
  };
};
