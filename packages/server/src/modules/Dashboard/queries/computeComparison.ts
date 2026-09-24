// © 2026 Bigfin
import * as moment from 'moment';

/**
 * Сравнение периодов на главной (FT-061 ТЗ-3).
 *
 * Варианты: прошлый период такой же длины (как было) · два периода назад ·
 * этот период в прошлом году · произвольный.
 *
 * ГЛАВНОЕ ПРАВИЛО — «НЕТ БАЗЫ» ВМЕСТО ПРОЦЕНТА. Если за базу сравнения данных
 * нет (ноль), процент не показывается вовсе: «+100 %» или «∞» к нулю — не
 * рост, а отсутствие сравнения. Финтабло в этом месте рисует проценты (W1).
 */
export type ComparisonKind = 'previous' | 'previous2' | 'last_year' | 'custom';

export const COMPARISON_KINDS: ComparisonKind[] = ['previous', 'previous2', 'last_year', 'custom'];

export interface ComparisonPeriod {
  kind: ComparisonKind;
  fromDate: string;
  toDate: string;
}

export function comparisonPeriod(
  period: { fromDate: string; toDate: string },
  kind: string | undefined,
  custom?: { fromDate?: string; toDate?: string },
): ComparisonPeriod {
  const from = moment(period.fromDate);
  const to = moment(period.toDate);
  const length = to.diff(from, 'days') + 1;
  const iso = (m: moment.Moment) => m.format('YYYY-MM-DD');

  if (kind === 'custom' && custom?.fromDate && custom?.toDate && custom.fromDate <= custom.toDate) {
    return { kind: 'custom', fromDate: custom.fromDate, toDate: custom.toDate };
  }
  if (kind === 'last_year') {
    return {
      kind: 'last_year',
      fromDate: iso(from.clone().subtract(1, 'year')),
      toDate: iso(to.clone().subtract(1, 'year')),
    };
  }
  const shift = kind === 'previous2' ? 2 : 1;
  return {
    kind: kind === 'previous2' ? 'previous2' : 'previous',
    fromDate: iso(from.clone().subtract(length * shift, 'days')),
    toDate: iso(to.clone().subtract(length * shift, 'days')),
  };
}

/** Изменение в процентах; `null` — «нет базы для сравнения». */
export function changePercent(current: number, base: number): number | null {
  if (!base) return null;
  return Math.round(((current - base) / Math.abs(base)) * 1000) / 10;
}
