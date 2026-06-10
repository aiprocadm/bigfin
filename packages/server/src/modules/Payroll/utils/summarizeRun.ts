// © 2026 Bigfin
import { toNumber, round2 } from './payrollMath';

export interface RunTotals {
  totalGross: number;
  totalNdfl: number;
  totalContributions: number;
  totalNet: number;
  totalCost: number;
}

interface SummarizableLine {
  grossAmount?: number;
  baseAmount?: number;
  bonusAmount?: number;
  ndflAmount: number;
  contributionsAmount: number;
  netAmount: number;
  totalCost: number;
}

export function summarizeRun(lines: SummarizableLine[]): RunTotals {
  return {
    totalGross: round2(
      lines.reduce((s, l) => {
        const gross = Number.isFinite(Number(l.grossAmount))
          ? toNumber(l.grossAmount)
          : toNumber(l.baseAmount) + toNumber(l.bonusAmount);
        return s + gross;
      }, 0),
    ),
    totalNdfl: round2(lines.reduce((s, l) => s + toNumber(l.ndflAmount), 0)),
    totalContributions: round2(
      lines.reduce((s, l) => s + toNumber(l.contributionsAmount), 0),
    ),
    totalNet: round2(lines.reduce((s, l) => s + toNumber(l.netAmount), 0)),
    totalCost: round2(lines.reduce((s, l) => s + toNumber(l.totalCost), 0)),
  };
}
