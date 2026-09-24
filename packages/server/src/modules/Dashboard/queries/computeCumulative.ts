// © 2026 Bigfin
import * as moment from 'moment';
import { MonthlyPlan, round2 } from './computeProratedPlan';

/**
 * Кумулятивное выполнение плана по дням (FT-062 ТЗ-3): «сколько накопили к
 * этому дню против плана и против того же дня прошлого периода».
 *
 * План к дню — доля месячного плана по прошедшим дням (как у FT-060), так что
 * последняя точка плана совпадает с планом периода, а точка «сегодня» — с
 * пропорциональным планом. Факт после сегодня не рисуется (`null`): ноль там
 * читался бы как «ничего не заработали», а это просто будущее.
 */
export interface CumulativePoint {
  date: string;
  /** Накоплено по сегодня; `null` — день ещё не наступил. */
  fact: number | null;
  plan: number | null;
  /** Столько же дней от начала базы сравнения; `null` — база короче. */
  previous: number | null;
}

export function buildCumulative(input: {
  period: { fromDate: string; toDate: string };
  base: { fromDate: string; toDate: string };
  today: string;
  /** Выручка по дням текущего периода: `{ 'YYYY-MM-DD': сумма }`. */
  factByDate: Record<string, number>;
  /** Выручка по дням базы сравнения. */
  baseByDate: Record<string, number>;
  /** Помесячный план; пусто — линии плана нет. */
  plans: MonthlyPlan[];
}): CumulativePoint[] {
  const from = moment(input.period.fromDate);
  const to = moment(input.period.toDate);
  const baseFrom = moment(input.base.fromDate);
  const baseTo = moment(input.base.toDate);
  const planOf = new Map(input.plans.map((p) => [moment(p.month).format('YYYY-MM'), Number(p.amount) || 0]));
  const hasPlan = input.plans.length > 0;

  const points: CumulativePoint[] = [];
  let fact = 0;
  let plan = 0;
  let previous = 0;
  for (let day = from.clone(), index = 0; day.isSameOrBefore(to, 'day'); day.add(1, 'day'), index++) {
    const date = day.format('YYYY-MM-DD');
    fact += Number(input.factByDate[date]) || 0;
    plan += (planOf.get(day.format('YYYY-MM')) ?? 0) / day.daysInMonth();
    const baseDay = baseFrom.clone().add(index, 'days');
    const inBase = baseDay.isSameOrBefore(baseTo, 'day');
    if (inBase) previous += Number(input.baseByDate[baseDay.format('YYYY-MM-DD')]) || 0;
    points.push({
      date,
      fact: date <= input.today ? round2(fact) : null,
      plan: hasPlan ? round2(plan) : null,
      previous: inBase ? round2(previous) : null,
    });
  }
  return points;
}
