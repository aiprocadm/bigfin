// © 2026 Bigfin
import * as moment from 'moment';
import { Candidate } from '../utils/selectToFire';

/** За сколько дней до срока напоминаем, если владелец не задал своё. */
export const DEFAULT_TAX_DUE_DAYS = 7;

export interface TaxDueInput {
  /** Сумма оценки налога за квартал. */
  amount: number;
  /** Ставка, по которой считали, в процентах. */
  ratePercent: number;
  /** Срок уплаты в формате YYYY-MM-DD. */
  dueDate: string;
}

/**
 * Н4 карты v22. Напоминание о сроке уплаты налога.
 *
 * Срок уплаты — самый предсказуемый платёж в году: даты известны заранее.
 * Продукт уже считает оценку налога, но молчал о ней до тех пор, пока
 * человек сам не откроет главную. Теперь за неделю до срока напоминает
 * сам — в ленте, а при настроенном канале и письмом.
 *
 * Не напоминаем, когда:
 *  - оценки нет (не упрощёнка, режим не задан) — напоминать не о чем;
 *  - платить нечего (ноль) — тревожить незачем;
 *  - до срока ещё далеко;
 *  - срок уже прошёл: напоминание «заплатите вчера» бесполезно и пугает.
 *    Про просрочку человек узнаёт из плитки на главной, а не из окрика.
 */
export const taxDueDecide = (
  estimate: TaxDueInput | null,
  today: string,
  daysBefore: number = DEFAULT_TAX_DUE_DAYS,
): Candidate[] => {
  if (!estimate || !(estimate.amount > 0)) return [];

  const due = moment(estimate.dueDate, 'YYYY-MM-DD', true);
  const day = moment(today, 'YYYY-MM-DD', true);

  if (!due.isValid() || !day.isValid()) return [];

  const daysLeft = due.diff(day, 'days');
  const window = Number.isFinite(daysBefore) && daysBefore >= 0
    ? daysBefore
    : DEFAULT_TAX_DUE_DAYS;

  if (daysLeft < 0 || daysLeft > window) return [];

  return [
    {
      eventType: 'tax_due',
      // Ключ включает срок: за каждый квартал напоминаем отдельно, а не
      // один раз за всё время.
      dedupKey: `tax_due:${estimate.dueDate}`,
      title: 'tax_due.title',
      body: 'tax_due.body',
      payload: {
        amount: estimate.amount,
        ratePercent: estimate.ratePercent,
        dueDate: estimate.dueDate,
        daysLeft,
      },
    },
  ];
};
