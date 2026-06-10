// © 2026 Bigfin
const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface RunTotals {
  totalNdfl: number;
  totalContributions: number;
  totalNet: number;
  totalCost: number;
}

interface SummarizableLine {
  ndflAmount: number;
  contributionsAmount: number;
  netAmount: number;
  totalCost: number;
}

export function summarizeRun(lines: SummarizableLine[]): RunTotals {
  return {
    totalNdfl: round2(lines.reduce((s, l) => s + toNumber(l.ndflAmount), 0)),
    totalContributions: round2(
      lines.reduce((s, l) => s + toNumber(l.contributionsAmount), 0),
    ),
    totalNet: round2(lines.reduce((s, l) => s + toNumber(l.netAmount), 0)),
    totalCost: round2(lines.reduce((s, l) => s + toNumber(l.totalCost), 0)),
  };
}
