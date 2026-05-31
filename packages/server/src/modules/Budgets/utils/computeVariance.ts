const round = (n: number, d = 2): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/**
 * Computes plan/fact variance.
 * @param {number} plan
 * @param {number} fact
 * @returns {{ varianceAbs: number; variancePct: number | null }}
 */
export function computeVariance(
  plan: number,
  fact: number,
): { varianceAbs: number; variancePct: number | null } {
  const varianceAbs = round(fact - plan, 3);
  const variancePct = plan === 0 ? null : round(((fact - plan) / plan) * 100, 2);
  return { varianceAbs, variancePct };
}
