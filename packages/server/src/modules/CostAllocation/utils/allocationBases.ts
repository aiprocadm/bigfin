// © 2026 Bigfin
import { allocatePool, AllocationAmount, AllocationWeight } from './allocatePool';

/**
 * Базы распределения косвенных расходов (FT-011 ТЗ-3).
 *
 * - `revenue` — по выручке цели;
 * - `production_payroll` — по ФОТ (статья зарплаты из настроек «Зарплаты»);
 * - `gross_profit_1` — по валовой прибыли ВП1 цели;
 * - `equal` — поровну;
 * - `manual_share` — по весам, заданным вручную.
 *
 * Отрицательный вес — ноль: убыточное направление не должно «получать»
 * отрицательную долю аренды, то есть зарабатывать на чужих расходах.
 */
export const ALLOCATION_BASES = [
  'revenue',
  'production_payroll',
  'gross_profit_1',
  'equal',
  'manual_share',
] as const;

export type AllocationBase = (typeof ALLOCATION_BASES)[number];

export interface AllocationTarget {
  id: number;
  name: string;
  revenue?: number;
  productionPayroll?: number;
  grossProfit1?: number;
}

/**
 * Веса целей по базе — в алфавитном порядке имён. Порядок не случаен:
 * копеечный остаток округления `allocatePool` отдаёт первой из равных
 * целей, и при равных долях он детерминированно уходит первой по алфавиту
 * (критерий 3 FT-011).
 */
export function baseWeights(
  base: AllocationBase,
  targets: AllocationTarget[],
  manualShares: Record<string | number, number> = {},
): AllocationWeight[] {
  const sorted = [...targets].sort(
    (a, b) => a.name.localeCompare(b.name, 'ru') || a.id - b.id,
  );
  const weightOf = (target: AllocationTarget): number => {
    switch (base) {
      case 'revenue':
        return target.revenue ?? 0;
      case 'production_payroll':
        return target.productionPayroll ?? 0;
      case 'gross_profit_1':
        return target.grossProfit1 ?? 0;
      case 'equal':
        return 1;
      case 'manual_share':
        return Number(manualShares[target.id] ?? 0) || 0;
      default:
        return 0;
    }
  };
  return sorted.map((target) => ({
    dealId: target.id,
    weight: Math.max(0, weightOf(target)),
  }));
}

/**
 * Делит пул по базе. `zeroBase` — у всех целей база нулевая: распределять
 * не по чему, пул остаётся нераспределённым, и об этом надо сказать.
 */
export function allocateByBase(
  pool: number,
  base: AllocationBase,
  targets: AllocationTarget[],
  manualShares?: Record<string | number, number>,
): { amounts: AllocationAmount[]; zeroBase: boolean } {
  const weights = baseWeights(base, targets, manualShares);
  const amounts = allocatePool(pool, weights);
  return { amounts, zeroBase: amounts.length === 0 && pool !== 0 };
}
