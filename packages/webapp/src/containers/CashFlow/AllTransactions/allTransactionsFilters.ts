import moment from 'moment';
import type { AllTransactionsFilters } from '@/hooks/query/cashflowAccounts';

/**
 * Отборы списка операций живут в адресной строке (приёмка этапа 3 ТЗ:
 * «ссылку можно переслать коллеге»). Здесь — только перевод туда и обратно,
 * без React: так это можно проверить тестами.
 */

/** Период по умолчанию — текущий месяц (п. 3.1 ТЗ). */
export const defaultPeriod = (today: moment.MomentInput = undefined) => {
  const now = moment(today);
  return {
    fromDate: now.clone().startOf('month').format('YYYY-MM-DD'),
    toDate: now.clone().endOf('month').format('YYYY-MM-DD'),
  };
};

/** Числовые отборы: в адресе они строки, в запросе — числа. */
const NUMERIC_KEYS = ['accountId', 'contactId', 'minAmount', 'maxAmount'] as const;

/** Читает отборы из строки запроса адреса. */
export const filtersFromSearch = (search: string): AllTransactionsFilters => {
  const params = new URLSearchParams(search);
  const filters: AllTransactionsFilters = {};

  const text = (key: keyof AllTransactionsFilters) => {
    const value = params.get(key);
    if (value) {
      (filters as any)[key] = value;
    }
  };

  text('fromDate');
  text('toDate');
  text('search');

  const flow = params.get('flow');
  if (flow === 'in' || flow === 'out') {
    filters.flow = flow;
  }

  NUMERIC_KEYS.forEach((key) => {
    const raw = params.get(key);
    if (raw === null || raw === '') return;

    const value = Number(raw);
    // Мусор в адресе не должен превращаться в `NaN` и уезжать на сервер.
    if (Number.isFinite(value)) {
      (filters as any)[key] = value;
    }
  });

  return filters;
};

/** Собирает строку запроса адреса из отборов. Пустые не пишет. */
export const searchFromFilters = (filters: AllTransactionsFilters): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const query = params.toString();

  return query ? `?${query}` : '';
};

/** Сколько отборов задано сверх периода — для подписи на кнопке. */
export const countExtraFilters = (filters: AllTransactionsFilters): number =>
  Object.entries(filters).filter(
    ([key, value]) =>
      !['fromDate', 'toDate'].includes(key) &&
      value !== undefined &&
      value !== null &&
      value !== '',
  ).length;
