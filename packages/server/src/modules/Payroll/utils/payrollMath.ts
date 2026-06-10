// © 2026 Bigfin
export const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n: number): number => Math.round(n * 100) / 100;
