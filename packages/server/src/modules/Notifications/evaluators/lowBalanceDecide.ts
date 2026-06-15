// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export const lowBalanceDecide = (
  accounts: { name: string; amount: number }[],
  minAmount: number,
): Candidate[] => {
  const below = accounts.filter((a) => Number(a.amount) < minAmount);
  if (!below.length) return [];
  return [
    {
      eventType: 'low_balance',
      dedupKey: 'low_balance',
      title: 'low_balance.title',
      body: 'low_balance.body',
      payload: { minAmount, accounts: below },
    },
  ];
};
