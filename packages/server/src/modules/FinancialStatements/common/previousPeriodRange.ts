// © 2026 Bigfin
import * as moment from 'moment';

import { DateInput } from '@/common/types/Date';

/**
 * Прошлый период: ОДНО правило на все отчёты.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Сравнение с прошлым периодом есть в Балансе, ОПиУ и
 * Движении денег. Если каждый отчёт сдвигает даты по-своему, отчёты начинают
 * спорить между собой: Баланс сравнивает с одним отрезком, ДДС — с другим, и
 * оба выглядят правильными. Такое расхождение не падает и не пишет в журнал.
 *
 * Правило: прошлый период — это отрезок ТОЙ ЖЕ ДЛИНЫ, вплотную предшествующий
 * выбранному. Для марта (31 день) это февраль, для квартала — предыдущий
 * квартал, для «с 10 по 20 число» — «с 30 прошлого месяца по 9».
 */
export interface PreviousPeriodRange {
  fromDate: Date;
  toDate: Date;
}

/**
 * Длина периода в днях, включая оба конца.
 *
 * Именно ВКЛЮЧАЯ: период «с 1 по 31 марта» длится 31 день, а не 30. Без
 * единицы прошлый период каждый раз наезжал бы на текущий одним днём.
 */
export function previousPeriodDiffDays(
  fromDate: DateInput,
  toDate: DateInput,
): number {
  return moment(toDate).diff(fromDate, 'days') + 1;
}

/** Отрезок той же длины, стоящий вплотную перед выбранным. */
export function previousPeriodTotalRange(
  fromDate: DateInput,
  toDate: DateInput,
): PreviousPeriodRange {
  const days = previousPeriodDiffDays(fromDate, toDate);

  return {
    fromDate: moment(fromDate).subtract(days, 'days').toDate(),
    toDate: moment(toDate).subtract(days, 'days').toDate(),
  };
}
