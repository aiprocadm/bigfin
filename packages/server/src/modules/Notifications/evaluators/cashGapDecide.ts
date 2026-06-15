// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export const cashGapDecide = (
  gap: { date: string; amount: number; daysFromStart: number } | null,
  horizonDays: number,
): Candidate[] => {
  if (!gap || gap.daysFromStart > horizonDays) return [];
  return [
    {
      eventType: 'cash_gap',
      dedupKey: 'cash_gap',
      title: 'cash_gap.title',
      body: 'cash_gap.body',
      payload: gap,
    },
  ];
};
