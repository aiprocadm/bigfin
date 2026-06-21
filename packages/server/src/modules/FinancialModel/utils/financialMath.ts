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
 * CAC = расход на маркетинг ÷ число новых клиентов.
 * Неприменим при нуле/некорректном числе новых клиентов.
 */
export function computeCac(spend: number, newCustomers: number): MetricValue {
  if (!Number.isFinite(newCustomers) || newCustomers <= 0) {
    return { value: 0, applicable: false };
  }
  return { value: round2(spend / newCustomers), applicable: true };
}

/**
 * ROMI (по решению основателя — фактически ROAS) = выручка ÷ расход на
 * маркетинг, «рублей выручки на рубль маркетинга». Неприменим при нулевом расходе.
 */
export function computeRomi(revenue: number, spend: number): MetricValue {
  if (!Number.isFinite(spend) || spend <= 0) {
    return { value: 0, applicable: false };
  }
  return { value: round2(revenue / spend), applicable: true };
}

/**
 * Средний чек = выручка ÷ число клиентов с продажами за период.
 * Неприменим при нуле клиентов.
 */
export function computeAverageCheck(
  revenue: number,
  customerCount: number,
): MetricValue {
  if (!Number.isFinite(customerCount) || customerCount <= 0) {
    return { value: 0, applicable: false };
  }
  return { value: round2(revenue / customerCount), applicable: true };
}

/**
 * LTV (упрощённый) = средний чек × маржинальность(доля) × срок жизни (мес.).
 * Неприменим, если срок жизни ≤ 0 (не задан) или средний чек ≤ 0 (нет выручки).
 */
export function computeLtv(
  averageCheck: number,
  marginFraction: number,
  lifetimeMonths: number,
): MetricValue {
  if (
    !Number.isFinite(lifetimeMonths) ||
    lifetimeMonths <= 0 ||
    !Number.isFinite(averageCheck) ||
    averageCheck <= 0
  ) {
    return { value: 0, applicable: false };
  }
  return {
    value: round2(averageCheck * marginFraction * lifetimeMonths),
    applicable: true,
  };
}

/**
 * Точка безубыточности = постоянные затраты ÷ маржинальность (доля 0..1).
 * Выручка, при которой прибыль = 0. Неприменима (applicable=false), если маржа
 * ≤ 0 или не число: при неположительной марже постоянные затраты не покрыть ни
 * при какой выручке («недостижима при текущей марже»). При нулевых постоянных
 * затратах и положительной марже — 0 (безубыточность достигается сразу).
 */
export function computeBreakEven(
  fixedCosts: number,
  marginFraction: number,
): MetricValue {
  if (!Number.isFinite(marginFraction) || marginFraction <= 0) {
    return { value: 0, applicable: false };
  }
  return { value: round2(fixedCosts / marginFraction), applicable: true };
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
