// © 2026 Bigfin
import intl from 'react-intl-universal';
import moment from 'moment';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { formatOrganizationDate } from '@/utils/organizationDate';
import { formatPercent } from '@/containers/Homepage/formatPercent';
import type { FigureFormatters } from './aiCfoHelpers';

/**
 * Форматы AI CFO — те же, что во всём продукте: деньги в валюте организации,
 * даты в её формате. Ответ AI CFO обязан читаться так же, как отчёт, из
 * которого взяты числа, иначе «сходится ли?» пришлось бы проверять в уме.
 */
export function formatAiCfoDate(iso: string): string {
  const parsed = moment(iso, ['YYYY-MM-DD', moment.ISO_8601]);
  return parsed.isValid() ? formatOrganizationDate(parsed.toDate()) : iso;
}

/** Время расчёта: дата организации и часы — «когда посчитано» важно для доверия. */
export function formatAiCfoDateTime(value: string): string {
  const parsed = moment(value, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601]);
  if (!parsed.isValid()) return value;
  return `${formatOrganizationDate(parsed.toDate())} ${parsed.format('HH:mm')}`;
}

export function aiCfoFormatters(): FigureFormatters {
  return {
    money: (value) => formatOrganizationMoney(value),
    percent: (value) => intl.get('ai_cfo.figure.percent', { value: formatPercent(value) }),
    date: formatAiCfoDate,
    none: intl.get('ai_cfo.figure.no_base'),
  };
}
