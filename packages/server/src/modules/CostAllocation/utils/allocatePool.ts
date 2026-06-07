// © 2026 Bigfin
export interface AllocationWeight {
  dealId: number;
  weight: number;
}
export interface AllocationAmount {
  dealId: number;
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Распределяет пул по весам (доход/ручная доля). Отрицательные веса = 0.
 * Метод наибольшего остатка: копеечный остаток округления добавляется цели
 * с наибольшим весом, чтобы сумма распределения точно равнялась пулу.
 */
export function allocatePool(
  pool: number,
  weights: AllocationWeight[],
): AllocationAmount[] {
  const positive = weights
    .map((w) => ({ dealId: w.dealId, weight: Math.max(0, Number(w.weight) || 0) }))
    .filter((w) => w.weight > 0);

  const totalWeight = positive.reduce((s, w) => s + w.weight, 0);
  if (totalWeight <= 0) return [];

  const rounded = positive.map((w) => ({
    dealId: w.dealId,
    amount: round2((pool * w.weight) / totalWeight),
  }));

  const residual = round2(pool - rounded.reduce((s, x) => s + x.amount, 0));
  if (residual !== 0) {
    const top = positive.reduce(
      (best, w, i) => (w.weight > positive[best].weight ? i : best),
      0,
    );
    rounded[top] = {
      dealId: rounded[top].dealId,
      amount: round2(rounded[top].amount + residual),
    };
  }
  return rounded;
}
