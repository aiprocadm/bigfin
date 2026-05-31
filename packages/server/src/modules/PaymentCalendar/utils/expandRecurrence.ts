import * as moment from 'moment';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  dayOfMonth?: number;
  weekday?: number;
  endDate?: string | null;
}

const UNIT: Record<
  RecurrenceRule['frequency'],
  moment.unitOfTime.DurationConstructor
> = {
  daily: 'days',
  weekly: 'weeks',
  monthly: 'months',
};

/**
 * Expands a recurrence rule into concrete dates within [rangeStart, rangeEnd].
 * Anchored at `anchorDate` (the operation's planned_date = first occurrence).
 * The occurrence day follows the anchor day (monthly clamps short months).
 * @returns {string[]} ISO dates (YYYY-MM-DD), ascending.
 */
export function expandRecurrence(
  rule: RecurrenceRule,
  anchorDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const unit = UNIT[rule.frequency];
  const interval = Math.max(1, Number(rule.interval) || 1);

  const end = rule.endDate
    ? moment.min(moment(rangeEnd), moment(rule.endDate))
    : moment(rangeEnd);
  const start = moment(rangeStart);

  const result: string[] = [];
  let cursor = moment(anchorDate);
  let guard = 0;

  while (cursor.isSameOrBefore(end, 'day') && guard < 10000) {
    if (cursor.isSameOrAfter(start, 'day')) {
      result.push(cursor.format('YYYY-MM-DD'));
    }
    cursor = cursor.clone().add(interval, unit);
    guard += 1;
  }

  return result;
}
