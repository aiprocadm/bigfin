// © 2026 Bigfin
import * as moment from 'moment';

/**
 * Пропорциональный план (FT-060 ТЗ-3): «план с 1 по сегодня».
 *
 * ЗАЧЕМ. 10-го числа факт месяца всегда «сильно ниже плана» — прошла треть
 * месяца. Сравнение с полным планом поднимает ложную тревогу каждый день до
 * последнего. Сравнивать надо с той долей плана, что приходится на уже
 * прошедшие дни.
 *
 * ПРАВИЛО. План хранится помесячно. Месяц, целиком прошедший, идёт в
 * пропорциональный план полностью; текущий — пропорционально прошедшим дням
 * (сегодня включительно); будущий — нулём. Для периода внутри месяца (или
 * квартала) доля месяца считается по его дням, попавшим в период.
 *
 * AC ТЗ: 21-го числа 31-дневного месяца при плане 750 000 — 508 065 ± 1.
 */
export interface MonthlyPlan {
  /** Первый день месяца, `YYYY-MM-01`. */
  month: string;
  amount: number;
}

export interface ProratedPlan {
  /** План на весь выбранный период. */
  periodPlan: number;
  /** План с начала периода по сегодня включительно. */
  proratedPlan: number;
  elapsedDays: number;
  totalDays: number;
}

const days = (from: moment.Moment, to: moment.Moment) =>
  to.isBefore(from, 'day') ? 0 : to.diff(from, 'days') + 1;

export function computeProratedPlan(
  plans: MonthlyPlan[],
  period: { fromDate: string; toDate: string },
  today: string,
): ProratedPlan {
  const from = moment(period.fromDate);
  const to = moment(period.toDate);
  const now = moment.min(moment(today), to);
  let periodPlan = 0;
  let proratedPlan = 0;

  for (const plan of plans) {
    const monthStart = moment(plan.month).startOf('month');
    const monthEnd = monthStart.clone().endOf('month');
    const inMonth = monthStart.daysInMonth();
    const start = moment.max(monthStart, from);
    const end = moment.min(monthEnd, to);
    const inPeriod = days(start, end);
    if (inPeriod === 0) continue;
    const amount = Number(plan.amount) || 0;
    periodPlan += (amount * inPeriod) / inMonth;
    proratedPlan += (amount * days(start, moment.min(end, now))) / inMonth;
  }
  return {
    periodPlan: round2(periodPlan),
    proratedPlan: round2(proratedPlan),
    elapsedDays: days(from, now),
    totalDays: days(from, to),
  };
}

export const round2 = (value: number) => Math.round(value * 100) / 100;
