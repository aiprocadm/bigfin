// © 2026 Bigfin
import * as moment from 'moment';

export interface MetricValue {
  value: number;
  applicable: boolean;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Выручка на сотрудника = выручка ÷ число активных сотрудников.
 * При нуле сотрудников метрика неприменима (applicable=false), не делим на ноль.
 */
export function computeRevenuePerEmployee(
  revenue: number,
  employeeCount: number,
): MetricValue {
  if (!employeeCount || employeeCount <= 0) {
    return { value: 0, applicable: false };
  }
  return { value: round2(revenue / employeeCount), applicable: true };
}

/**
 * Список месяцев 'YYYY-MM' от fromDate до toDate включительно (по месяцам).
 * Если from позже to — пустой массив.
 */
export function enumerateMonths(fromDate: string, toDate: string): string[] {
  const start = moment(fromDate).startOf('month');
  const end = moment(toDate).startOf('month');
  if (start.isAfter(end)) return [];
  const months: string[] = [];
  const cursor = start.clone();
  while (!cursor.isAfter(end)) {
    months.push(cursor.format('YYYY-MM'));
    cursor.add(1, 'month');
  }
  return months;
}
