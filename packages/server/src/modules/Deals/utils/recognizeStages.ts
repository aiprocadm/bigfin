// © 2026 Bigfin
export interface StageInput {
  plannedRevenue: number;
  plannedCost: number;
  status: string;
  closedDate?: string | null;
}

export interface StageAmounts {
  revenue: number;
  costs: number;
  profit: number;
}

export interface DealStagesSummary {
  planned: StageAmounts;
  recognized: StageAmounts;
  progress: number; // 0..1, by planned revenue
  byPeriod: Record<string, StageAmounts>;
  fact: StageAmounts;
}

const amounts = (revenue: number, costs: number): StageAmounts => ({
  revenue,
  costs,
  profit: revenue - costs,
});

const isRecognized = (s: StageInput) => s.status === 'closed' && !!s.closedDate;

/** Closed stages grouped by the month ('YYYY-MM') of their close date. */
export function recognizeStagesByPeriod(
  stages: StageInput[],
): Record<string, StageAmounts> {
  const out: Record<string, StageAmounts> = {};
  for (const s of stages) {
    if (!isRecognized(s)) continue;
    const period = String(s.closedDate).slice(0, 7);
    const prev = out[period] ?? amounts(0, 0);
    out[period] = amounts(
      prev.revenue + Number(s.plannedRevenue || 0),
      prev.costs + Number(s.plannedCost || 0),
    );
  }
  return out;
}

/** Deal-level plan (all stages), recognized (closed), progress, by-period, and fact. */
export function summarizeDealStages(
  stages: StageInput[],
  fact: StageAmounts,
): DealStagesSummary {
  const sum = (list: StageInput[]) =>
    amounts(
      list.reduce((a, s) => a + Number(s.plannedRevenue || 0), 0),
      list.reduce((a, s) => a + Number(s.plannedCost || 0), 0),
    );
  const planned = sum(stages);
  const recognized = sum(stages.filter(isRecognized));
  const progress = planned.revenue > 0 ? recognized.revenue / planned.revenue : 0;
  return {
    planned,
    recognized,
    progress,
    byPeriod: recognizeStagesByPeriod(stages),
    fact,
  };
}
