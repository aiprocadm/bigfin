import moment from 'moment';
import type { AllTransactionsFilters } from '@/hooks/query/cashflowAccounts';

/**
 * Отборы экрана. Кроме серверных сюда входит режим показа: `uncategorized` —
 * это «ждут разноски», отдельный список непроведённых операций (этап 3 ТЗ).
 * Режим на сервер списка проведённых не уходит.
 */
export interface ScreenFilters extends AllTransactionsFilters {
  status?: 'uncategorized';
  /** Статья учёта: пришла из отчёта, показывается строкой контекста. */
  articleId?: number;
  /**
   * Отбор по вычисленному состоянию (FIN-009 ТЗ-2): «нам должны»,
   * «мы должны», «просрочено», «план». Несколько — по «ИЛИ».
   */
  states?: string[];
  /** Показывать ли плановые операции (FIN-010 ТЗ-2). */
  includePlanned?: string;
}

/** Состояния, которые умеет отбирать реестр. Мусор из адреса отбрасывается. */
export const KNOWN_TRANSACTION_STATES = [
  'receivable',
  'payable',
  'overdue',
  'planned',
];

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
const NUMERIC_KEYS = [
  'accountId',
  // Отбор по статье приходит из раскрытия суммы отчёта (FIN-005 ТЗ-2):
  // «Открыть в Операциях» складывает его прямо в адрес.
  'articleId',
  'contactId',
  'minAmount',
  'maxAmount',
  // Направление (FT-021 ТЗ-3).
  'projectId',
] as const;

/** Читает отборы из строки запроса адреса. */
export const filtersFromSearch = (search: string): ScreenFilters => {
  const params = new URLSearchParams(search);
  const filters: ScreenFilters = {};

  const text = (key: keyof ScreenFilters) => {
    const value = params.get(key);
    if (value) {
      (filters as any)[key] = value;
    }
  };

  text('fromDate');
  text('toDate');
  text('search');
  // Метка операции (FT-025 ТЗ-3).
  text('tag');

  const flow = params.get('flow');
  if (flow === 'in' || flow === 'out') {
    filters.flow = flow;
  }

  if (params.get('status') === 'uncategorized') {
    filters.status = 'uncategorized';
  }

  /**
   * Состояния приходят повторяющимся параметром. Неизвестное МОЛЧА
   * отбрасывается, а не роняет экран и не сужает список до пустоты:
   * опечатался тот, кто прислал ссылку, а смотрит её другой человек.
   */
  const states = params
    .getAll('states')
    .filter((value) => KNOWN_TRANSACTION_STATES.includes(value));
  if (states.length > 0) {
    filters.states = states;
  }

  if (params.get('includePlanned') === 'false') {
    filters.includePlanned = 'false';
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
export const searchFromFilters = (filters: ScreenFilters): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    // Список уходит повторяющимся параметром, а не через запятую: так его
    // читает сервер, и так же собирает переход из отчёта.
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();

  return query ? `?${query}` : '';
};

/**
 * Отборы, которые уходят на сервер списка проведённых операций: без режима
 * показа — он к запросу отношения не имеет.
 */
export const serverFilters = (filters: ScreenFilters): AllTransactionsFilters => {
  const { status, ...rest } = filters;
  return rest;
};

/** Сколько отборов задано сверх периода — для подписи на кнопке. */
export const countExtraFilters = (filters: ScreenFilters): number =>
  Object.entries(filters).filter(
    ([key, value]) =>
      !['fromDate', 'toDate'].includes(key) &&
      value !== undefined &&
      value !== null &&
      value !== '',
  ).length;

/**
 * Отборы, которые живут в шторке «Фильтры» (UI-048-1 ТЗ-4): всё, кроме
 * периода, типа, режима и поиска — те стоят прямо в строке.
 */
export const SHEET_FILTER_KEYS = [
  'articleId',
  'projectId',
  'tag',
  'states',
  'minAmount',
  'maxAmount',
  'accountId',
] as const;

const isSet = (value: unknown) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);

/** Сколько отборов шторки включено — число на кнопке «Фильтры (N)». */
export const countSheetFilters = (filters: ScreenFilters): number =>
  SHEET_FILTER_KEYS.filter((key) => isSet((filters as any)[key])).length;

/** «Сбросить» в шторке: снимает её отборы, строку не трогает. */
export const resetSheetFilters = (filters: ScreenFilters): ScreenFilters => {
  const next: ScreenFilters = { ...filters };
  SHEET_FILTER_KEYS.forEach((key) => {
    delete (next as any)[key];
  });
  return next;
};
