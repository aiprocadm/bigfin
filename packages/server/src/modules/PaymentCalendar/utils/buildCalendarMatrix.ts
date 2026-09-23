// © 2026 Bigfin
import { ForecastGranularity, periodKeyOf } from './aggregateForecast';

/**
 * Платёжный календарь как матрица «план / факт» (FT-050 ТЗ-3).
 *
 * Строки: остаток на начало · поступления · списания · изменение · остаток
 * на конец; колонки — периоды, в каждой — ПЛАН и ФАКТ.
 *
 * ГЛАВНОЕ ОТЛИЧИЕ ОТ КОНКУРЕНТА — ПЛАНОВЫЙ ОСТАТОК НАКАПЛИВАЕТСЯ. Остаток на
 * конец (план) = остаток на начало (план) + плановые изменения, и он же —
 * остаток на начало (план) следующей колонки. Первая колонка начинается с
 * фактического остатка. Так видно, куда приведёт план, если он сбудется, —
 * и где деньги кончатся (разрыв).
 *
 * Логика без базы — её держат тесты.
 */

export interface MatrixMovement {
  date: string;
  /** Со знаком: + поступление, − списание. */
  amount: number;
  /** Ключ группы строки (статья, контрагент, направление); null — «без …». */
  groupKey: string | null;
  accountId: number | null;
}

export interface MatrixPeriod {
  key: string;
  from: string;
  to: string;
}

export interface MatrixSide {
  opening: number;
  inflow: number;
  outflow: number;
  change: number;
  closing: number;
}

export interface MatrixColumn extends MatrixPeriod {
  plan: MatrixSide;
  fact: MatrixSide;
  /** Плановый остаток на конец ниже нуля — кассовый разрыв. */
  gap: boolean;
}

export interface MatrixGroupRow {
  key: string | null;
  /** Суммы по колонкам: поступления или списания группы (по модулю). */
  cells: Array<{ plan: number; fact: number }>;
}

export interface MatrixAccountRow {
  accountId: number;
  /** Остатки счёта на конец каждой колонки. */
  cells: Array<{ planClosing: number; factClosing: number }>;
}

export interface CalendarMatrix {
  columns: MatrixColumn[];
  inflowGroups: MatrixGroupRow[];
  outflowGroups: MatrixGroupRow[];
  accounts: MatrixAccountRow[];
}

const round = (value: number) => Math.round(value * 1000) / 1000;
const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Колонки периодов между датами — теми же ключами, что прогноз. */
export function matrixPeriods(
  fromDate: string,
  toDate: string,
  granularity: ForecastGranularity,
  weekStartDay = 1,
): MatrixPeriod[] {
  const periods: MatrixPeriod[] = [];
  const cursor = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (cursor <= end) {
    const date = iso(cursor);
    const key = periodKeyOf(date, granularity, weekStartDay);
    const last = periods[periods.length - 1];
    if (last && last.key === key) last.to = date;
    else periods.push({ key, from: date, to: date });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return periods;
}

const indexOfPeriod = (periods: MatrixPeriod[], date: string) =>
  periods.findIndex((period) => date >= period.from && date <= period.to);

function sides(periods: MatrixPeriod[], opening: number, movements: MatrixMovement[]): MatrixSide[] {
  const inflow = periods.map(() => 0);
  const outflow = periods.map(() => 0);
  for (const movement of movements) {
    const index = indexOfPeriod(periods, movement.date);
    if (index < 0) continue;
    if (movement.amount >= 0) inflow[index] += movement.amount;
    else outflow[index] += -movement.amount;
  }
  let running = opening;
  return periods.map((_, index) => {
    const change = inflow[index] - outflow[index];
    const side = {
      opening: round(running),
      inflow: round(inflow[index]),
      outflow: round(outflow[index]),
      change: round(change),
      closing: round(running + change),
    };
    running += change;
    return side;
  });
}

function groups(periods: MatrixPeriod[], plan: MatrixMovement[], fact: MatrixMovement[], sign: 1 | -1): MatrixGroupRow[] {
  const rows = new Map<string, MatrixGroupRow>();
  const add = (movement: MatrixMovement, side: 'plan' | 'fact') => {
    if (Math.sign(movement.amount) !== sign && !(sign === 1 && movement.amount === 0)) return;
    const index = indexOfPeriod(periods, movement.date);
    if (index < 0) return;
    const id = String(movement.groupKey ?? '∅');
    const row = rows.get(id) ?? { key: movement.groupKey, cells: periods.map(() => ({ plan: 0, fact: 0 })) };
    row.cells[index][side] = round(row.cells[index][side] + Math.abs(movement.amount));
    rows.set(id, row);
  };
  plan.forEach((movement) => add(movement, 'plan'));
  fact.forEach((movement) => add(movement, 'fact'));
  return [...rows.values()];
}

/**
 * @param openingByAccount фактические остатки денежных счетов на начало
 *   первой колонки; общий остаток — их сумма
 */
export function buildCalendarMatrix(input: {
  periods: MatrixPeriod[];
  openingByAccount: Map<number, number>;
  plan: MatrixMovement[];
  fact: MatrixMovement[];
}): CalendarMatrix {
  const { periods, plan, fact } = input;
  const opening = [...input.openingByAccount.values()].reduce((sum, value) => sum + value, 0);
  const planSides = sides(periods, opening, plan);
  const factSides = sides(periods, opening, fact);

  const accounts: MatrixAccountRow[] = [...input.openingByAccount.entries()].map(([accountId, start]) => {
    const planOf = sides(periods, start, plan.filter((m) => m.accountId === accountId));
    const factOf = sides(periods, start, fact.filter((m) => m.accountId === accountId));
    return {
      accountId,
      cells: periods.map((_, index) => ({
        planClosing: planOf[index].closing,
        factClosing: factOf[index].closing,
      })),
    };
  });

  return {
    columns: periods.map((period, index) => ({
      ...period,
      plan: planSides[index],
      fact: factSides[index],
      gap: planSides[index].closing < 0,
    })),
    inflowGroups: groups(periods, plan, fact, 1),
    outflowGroups: groups(periods, plan, fact, -1),
    accounts,
  };
}
