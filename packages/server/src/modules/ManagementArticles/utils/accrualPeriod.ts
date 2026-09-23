// © 2026 Bigfin
import * as moment from 'moment';

/**
 * Месяц начисления в отчётах о прибыли (FT-013 ТЗ-3).
 *
 * Операция с месяцем начисления попадает в отчёт о прибыли в ЭТОТ месяц, а
 * не в месяц платежа: аренду за декабрь, оплаченную 5 января, собственник
 * хочет видеть в декабрьской прибыли. Отчёт о деньгах этим НЕ пользуется —
 * деньги ушли в январе.
 *
 * Точность — месяц: месяц начисления не знает дня. Отчёт, начатый с
 * середины месяца, получит такую операцию целиком.
 */

const month = (value: moment.MomentInput | undefined | null) =>
  value ? moment(value).format('YYYY-MM') : null;
const day = (value: moment.MomentInput | undefined | null) =>
  value ? moment(value).format('YYYY-MM-DD') : null;

/**
 * Отбор проводок отрезка для отчёта о прибыли: без месяца начисления — по
 * дате, с месяцем — по месяцу. Одно место на все отчёты о прибыли.
 */
export function applyAccrualDateRange(
  qb: any,
  fromDate: moment.MomentInput | undefined | null,
  toDate: moment.MomentInput | undefined | null,
): void {
  const from = day(fromDate);
  const to = day(toDate);
  if (!from && !to) return;
  const fromMonth = month(fromDate);
  const toMonth = month(toDate);

  qb.where((outer: any) => {
    outer
      .where((byDate: any) => {
        byDate.whereNull('accrualPeriod');
        if (from) byDate.where('date', '>=', from);
        if (to) byDate.where('date', '<=', to);
      })
      .orWhere((byMonth: any) => {
        byMonth.whereNotNull('accrualPeriod');
        if (fromMonth) byMonth.where('accrualPeriod', '>=', fromMonth);
        if (toMonth) byMonth.where('accrualPeriod', '<=', toMonth);
      });
  });
}

/**
 * Дата, на которую проводка ложится в отчёте о прибыли: первое число месяца
 * начисления или своя дата. Если отчёт начат с середины того же месяца —
 * первый день отчёта, чтобы операция не выпала за левый край.
 */
export function profitDateOf(
  row: { accrualPeriod?: string | null; date?: Date | string | null },
  reportFrom?: string | null,
): string | null {
  if (row.accrualPeriod) {
    const first = `${row.accrualPeriod}-01`;
    if (reportFrom && first < reportFrom && reportFrom.slice(0, 7) === row.accrualPeriod) {
      return reportFrom;
    }
    return first;
  }
  if (!row.date) return null;
  if (typeof row.date === 'string') return row.date.slice(0, 10);
  const date = row.date;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
