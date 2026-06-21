// © 2026 Bigfin
import * as moment from 'moment';

export interface MetricValue {
  value: number;
  applicable: boolean;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Выручка на сотрудника = выручка ÷ число активных сотрудников.
 * Неприменима (applicable=false), если число сотрудников ≤ 0 или не число —
 * не делим на ноль/мусор.
 */
export function computeRevenuePerEmployee(
  revenue: number,
  employeeCount: number,
): MetricValue {
  if (!Number.isFinite(employeeCount) || employeeCount <= 0) {
    return { value: 0, applicable: false };
  }
  return { value: round2(revenue / employeeCount), applicable: true };
}

export interface ProductMarginRow {
  itemId: number;
  revenue: number;
  cost: number; // себестоимость проданного (COGS)
  grossMargin: number; // выручка − себестоимость
  margin: number; // доля 0..1; 0, если выручки нет (не делим на ноль)
}

/**
 * Сшивает карты «выручка по товару» и «себестоимость по товару» в строки
 * валовой маржи. Строка создаётся для каждого товара, встретившегося хотя бы
 * в одной карте (товар может иметь выручку без себестоимости или наоборот).
 * Маржа% = валовая_маржа ÷ выручка, 0 при нулевой выручке. Сортировка — по
 * валовой марже по убыванию (как сделки по прибыли в GetDealsSummary).
 * Имена товаров здесь не нужны — их добавляет слой запроса (join к items).
 */
export function computeProductMargins(
  revenueByItem: Record<number, number>,
  costByItem: Record<number, number>,
): ProductMarginRow[] {
  const itemIds = new Set<number>([
    ...Object.keys(revenueByItem).map(Number),
    ...Object.keys(costByItem).map(Number),
  ]);
  const rows: ProductMarginRow[] = [];
  for (const itemId of itemIds) {
    const revenue = round2(revenueByItem[itemId] ?? 0);
    const cost = round2(costByItem[itemId] ?? 0);
    const grossMargin = round2(revenue - cost);
    const margin = revenue > 0 ? round2(grossMargin / revenue) : 0;
    rows.push({ itemId, revenue, cost, grossMargin, margin });
  }
  return rows.sort((a, b) => b.grossMargin - a.grossMargin);
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
