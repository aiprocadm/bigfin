import { MarketplaceSummary } from '../../types';

/** Безопасное число: нечисло/пусто → 0. */
const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Чистая агрегация финотчёта Wildberries (`reportDetailByPeriod`) в сводку.
 * Поля WB: `retail_amount` (выручка), `ppvz_for_pay` (к перечислению),
 * `delivery_rub` (логистика), `penalty` (штрафы), `storage_fee` (хранение).
 */
export const aggregateWbReport = (rows: any[]): MarketplaceSummary => {
  const sum = (field: string) =>
    (rows ?? []).reduce((acc, r) => acc + num(r?.[field]), 0);

  const revenue = sum('retail_amount');
  const toPay = sum('ppvz_for_pay');

  return {
    revenue,
    toPay,
    deductions: revenue - toPay,
    logistics: sum('delivery_rub'),
    penalties: sum('penalty'),
    storage: sum('storage_fee'),
  };
};
