import {
  CashGap,
  DayBalance,
  DayFlow,
  ForecastResult,
} from '../PaymentCalendar.interfaces';

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Computes the running cash balance per day and detects the first cash gap.
 * @param {number} openingBalance starting balance (base currency)
 * @param {DayFlow[]} flows daily net flows, ascending by date
 * @returns {ForecastResult}
 */
export function computeRunningBalance(
  openingBalance: number,
  flows: DayFlow[],
): ForecastResult {
  let balance = round3(openingBalance);
  const days: DayBalance[] = [];
  let gap: CashGap | null = null;

  flows.forEach((flow, index) => {
    balance = round3(balance + flow.inflow - flow.outflow);
    days.push({ ...flow, balance });

    if (gap === null && balance < 0) {
      gap = {
        date: flow.date,
        amount: round3(Math.abs(balance)),
        daysFromStart: index,
      };
    }
  });

  return { days, gap };
}
