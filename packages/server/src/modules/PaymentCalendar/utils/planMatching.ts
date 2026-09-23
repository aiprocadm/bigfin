// © 2026 Bigfin
import * as moment from 'moment';
import { expandRecurrence } from './expandRecurrence';

/**
 * Автоподтверждение плана фактом (FT-052 ТЗ-3).
 *
 * Факт закрывает план, если совпали направление, счёт, контрагент (если не
 * отмечено «с любым контрагентом»), сумма (до копейки при «точном
 * совпадении», иначе в пределах 5 %) и дата — не дальше 3 дней от
 * планового дня. Логика без базы — её держат тесты.
 */

/** Допуск по дате: платёж ушёл на пару дней раньше или позже плана. */
export const MATCH_DATE_TOLERANCE_DAYS = 3;
/** Допуск по сумме без «точного совпадения»: комиссия, округление. */
export const MATCH_AMOUNT_TOLERANCE = 0.05;

export interface MatchPlan {
  id: number;
  direction: 'inflow' | 'outflow' | string;
  amount: number;
  plannedDate: string;
  accountId: number | null;
  contactId: number | null;
  recurrence?: any;
  matchExactAmount?: boolean;
  matchAnyContact?: boolean;
}

export interface MatchFact {
  direction: 'inflow' | 'outflow';
  amount: number;
  date: string;
  accountId: number;
  contactId: number | null;
}

/** Что заполнить, чтобы автоподтверждение сработало (подсказка формы). */
export type AutoConfirmGap = 'account' | 'contact' | 'amount' | 'date';

export function autoConfirmHint(plan: Partial<MatchPlan>): { ready: boolean; missing: AutoConfirmGap[] } {
  const missing: AutoConfirmGap[] = [];
  if (!plan.accountId) missing.push('account');
  if (!plan.matchAnyContact && !plan.contactId) missing.push('contact');
  if (!(Number(plan.amount) > 0)) missing.push('amount');
  if (!plan.plannedDate) missing.push('date');
  return { ready: missing.length === 0, missing };
}

const amountsMatch = (plan: MatchPlan, fact: MatchFact) => {
  const planned = Math.abs(Number(plan.amount));
  const actual = Math.abs(Number(fact.amount));
  if (plan.matchExactAmount) return Math.round(planned * 100) === Math.round(actual * 100);
  return Math.abs(actual - planned) <= planned * MATCH_AMOUNT_TOLERANCE;
};

/**
 * День плана, которому соответствует факт: у разового — его дата, у
 * повторяющегося — ближайшее вхождение в пределах допуска. null — не
 * совпало.
 */
export function matchedOccurrence(plan: MatchPlan, fact: MatchFact): string | null {
  if (plan.direction !== fact.direction) return null;
  if (!plan.accountId || Number(plan.accountId) !== Number(fact.accountId)) return null;
  if (!plan.matchAnyContact && (!plan.contactId || Number(plan.contactId) !== Number(fact.contactId))) return null;
  if (!amountsMatch(plan, fact)) return null;

  const from = moment(fact.date).subtract(MATCH_DATE_TOLERANCE_DAYS, 'days').format('YYYY-MM-DD');
  const to = moment(fact.date).add(MATCH_DATE_TOLERANCE_DAYS, 'days').format('YYYY-MM-DD');
  const anchor = moment(plan.plannedDate).format('YYYY-MM-DD');
  const dates = plan.recurrence ? expandRecurrence(plan.recurrence, anchor, from, to) : anchor >= from && anchor <= to ? [anchor] : [];
  if (dates.length === 0) return null;
  // Ближайшее к факту вхождение.
  return dates.sort(
    (a, b) => Math.abs(moment(a).diff(fact.date, 'days')) - Math.abs(moment(b).diff(fact.date, 'days')),
  )[0];
}

/** Из подходящих планов — тот, чей день ближе всего к факту. */
export function pickPlanForFact<T extends MatchPlan>(plans: T[], fact: MatchFact): { plan: T; occurrence: string } | null {
  let best: { plan: T; occurrence: string; distance: number } | null = null;
  for (const plan of plans) {
    const occurrence = matchedOccurrence(plan, fact);
    if (!occurrence) continue;
    const distance = Math.abs(moment(occurrence).diff(fact.date, 'days'));
    if (!best || distance < best.distance) best = { plan, occurrence, distance };
  }
  return best ? { plan: best.plan, occurrence: best.occurrence } : null;
}
