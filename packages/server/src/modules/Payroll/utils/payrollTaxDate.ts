// © 2026 Bigfin
import * as moment from 'moment';

/** Плановая дата уплаты НДФЛ/взносов: 28-е месяца, следующего за месяцем начисления (ЕНП). */
export function payrollTaxDate(periodMonth: string): string {
  return moment(periodMonth).add(1, 'month').date(28).format('YYYY-MM-DD');
}
