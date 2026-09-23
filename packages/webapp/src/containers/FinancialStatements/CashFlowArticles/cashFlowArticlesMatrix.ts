import intl from 'react-intl-universal';
import moment from 'moment';

import type {
  ReportTableColumn,
  ReportTableRow,
} from '@/components/ui/report-table';
import {
  REPORT_SCALES,
  reportRange,
  type ReportScale,
} from '../v2';
import { isTotalRow } from './cashFlowArticlesRows';

/**
 * Матрица «Деньги по статьям»: статьи × периоды + «Итого» (FT-001 ТЗ-3) —
 * подготовка к показу.
 *
 * Без React, чтобы проверялось тестами: здесь живут правила, которые легко
 * сломать незаметно, — что читать из адреса, как подписать колонку и какие
 * строки считать итоговыми.
 */

/** Отбор отчёта так, как он живёт в адресе страницы. */
export interface CashFlowArticlesQuery {
  fromDate: string;
  toDate: string;
  dateGroup: ReportScale;
  legalEntityIds?: number[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isDate = (value: string | null): value is string =>
  Boolean(value && DATE.test(value) && moment(value, 'YYYY-MM-DD', true).isValid());

/**
 * Читает отбор из адреса.
 *
 * ПО УМОЛЧАНИЮ — ТЕКУЩИЙ ГОД ПО МЕСЯЦАМ. Матрица на один месяц — это одна
 * колонка, то есть прежний отчёт; ради ответа «в каком месяце ушли деньги»
 * её и делали. Год совпадает с кнопкой «Год» в полосе периода, и кнопка
 * выглядит нажатой — человек сразу видит, что показано.
 *
 * Мусор в адресе отбрасывается молча: опечатался тот, кто прислал ссылку,
 * а смотрит её другой человек.
 */
export function queryFromSearch(
  search: string,
  today: moment.MomentInput = undefined,
): CashFlowArticlesQuery {
  const params = new URLSearchParams(search);
  const fallback = reportRange('year', today);

  let fromDate = params.get('fromDate');
  let toDate = params.get('toDate');
  if (!isDate(fromDate) || !isDate(toDate) || toDate < fromDate) {
    fromDate = fallback.fromDate;
    toDate = fallback.toDate;
  }

  const scale = params.get('scale');
  const dateGroup = (REPORT_SCALES as readonly string[]).includes(scale ?? '')
    ? (scale as ReportScale)
    : 'month';

  const legalEntityIds = params
    .getAll('legalEntityIds')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  return {
    fromDate,
    toDate,
    dateGroup,
    ...(legalEntityIds.length ? { legalEntityIds } : {}),
  };
}

/**
 * Пишет отбор в адрес, не трогая чужие параметры.
 *
 * Масштаб по умолчанию («месяц») в адрес не пишется: ссылка короче, а
 * открывается так же.
 */
export function searchFromQuery(
  search: string,
  query: CashFlowArticlesQuery,
): string {
  const params = new URLSearchParams(search);

  params.set('fromDate', query.fromDate);
  params.set('toDate', query.toDate);
  if (query.dateGroup && query.dateGroup !== 'month') {
    params.set('scale', query.dateGroup);
  } else {
    params.delete('scale');
  }
  params.delete('legalEntityIds');
  (query.legalEntityIds ?? []).forEach((id) =>
    params.append('legalEntityIds', String(id)),
  );

  const result = params.toString();
  return result ? `?${result}` : '';
}

/** Колонка таблицы в том виде, в каком её прислал сервер. */
export interface MatrixServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  cellIndex?: number;
  from_date?: string;
  fromDate?: string;
  to_date?: string;
  toDate?: string;
  is_partial?: boolean;
  isPartial?: boolean;
  is_total?: boolean;
  isTotal?: boolean;
}

/**
 * Подпись колонки-периода на языке человека.
 *
 * Сервер тоже присылает подпись, но русскую и для выгрузок. Экран подписывает
 * сам — по границам периода и на языке интерфейса. Обрезанный период
 * подписан датами: «Январь» над колонкой с 15-го обещал бы весь месяц.
 */
export function formatPeriodLabel(
  column: { fromDate: string; toDate: string; isPartial?: boolean },
  dateGroup: ReportScale,
  locale = 'ru',
): string {
  const from = moment(column.fromDate, 'YYYY-MM-DD');
  const to = moment(column.toDate, 'YYYY-MM-DD');
  if (!from.isValid() || !to.isValid()) return '';

  const fmt = (value: moment.Moment, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(value.toDate());
  const dayMonth = { day: 'numeric', month: 'short' } as const;

  if (dateGroup === 'day') return fmt(from, { ...dayMonth, year: 'numeric' });

  if (column.isPartial || dateGroup === 'week' || dateGroup === 'total') {
    if (from.isSame(to, 'day')) return fmt(from, { ...dayMonth, year: 'numeric' });
    const sameYear = from.year() === to.year();
    return `${fmt(from, sameYear ? dayMonth : { ...dayMonth, year: 'numeric' })} – ${fmt(to, { ...dayMonth, year: 'numeric' })}`;
  }

  if (dateGroup === 'month') return fmt(from, { month: 'short', year: 'numeric' });
  if (dateGroup === 'quarter') {
    return intl.get('cash_flow_articles.period.quarter', {
      quarter: from.quarter(),
      year: from.year(),
    });
  }
  return String(from.year());
}

/** Колонки матрицы для ReportTable: название слева, числа справа. */
export function matrixColumns(
  serverColumns: MatrixServerColumn[] = [],
  dateGroup: ReportScale,
  locale = 'ru',
): ReportTableColumn[] {
  return (serverColumns ?? []).map((column, index) => {
    const cellIndex = column.cellIndex ?? column.cell_index ?? index;

    if (index === 0) {
      return {
        key: column.key,
        label: intl.get('cash_flow_articles.column.name'),
        cellIndex,
      };
    }
    if (column.isTotal ?? column.is_total) {
      return {
        key: column.key,
        label: intl.get('cash_flow_articles.column.total'),
        cellIndex,
        align: 'right' as const,
      };
    }

    const fromDate = column.fromDate ?? column.from_date;
    const toDate = column.toDate ?? column.to_date;
    return {
      key: column.key,
      label:
        fromDate && toDate
          ? formatPeriodLabel(
              {
                fromDate,
                toDate,
                isPartial: column.isPartial ?? column.is_partial,
              },
              dateGroup,
              locale,
            )
          : column.label,
      cellIndex,
      align: 'right' as const,
    };
  });
}

/**
 * Подписи служебных строк — по ключу строки, на языке интерфейса.
 *
 * Сервер подписывает их для выгрузок; на экране подпись должна быть на том
 * языке, на котором человек читает всё остальное.
 */
const ROW_LABEL_KEYS: Record<string, string> = {
  opening: 'cash_flow_articles.opening_balance',
  'section-operating': 'cash_flow_articles.section.operating',
  'section-investing': 'cash_flow_articles.section.investing',
  'section-financing': 'cash_flow_articles.section.financing',
  unclassified: 'cash_flow_articles.unclassified',
  net: 'cash_flow_articles.net_cash_flow',
  closing: 'cash_flow_articles.closing_balance',
  transfers: 'cash_flow_articles.transfers',
  'transfers-in': 'cash_flow_articles.transfers_in',
  'transfers-out': 'cash_flow_articles.transfers_out',
};

const rowLabelKey = (id: string): string | undefined => {
  if (ROW_LABEL_KEYS[id]) return ROW_LABEL_KEYS[id];
  if (id.startsWith('inflow-')) return 'cash_flow_articles.inflow';
  if (id.startsWith('outflow-')) return 'cash_flow_articles.outflow';
  return undefined;
};

/** Строка таблицы, как её присылает сервер (оба написания полей). */
export interface MatrixServerRow {
  id?: string;
  cells: Array<{ key: string; value: string }>;
  row_types?: string[];
  rowTypes?: string[];
  children?: MatrixServerRow[];
}

/**
 * Строки сервера → строки ReportTable: суммы в деньгах организации, итоги
 * помечены как TOTAL (жирным, с чертой сверху).
 */
export function matrixRows(
  rows: MatrixServerRow[] = [],
  formatMoney: (value: number) => string,
): ReportTableRow[] {
  return (rows ?? []).map((row) => {
    const types = row.rowTypes ?? row.row_types ?? [];
    const labelKey = row.id ? rowLabelKey(row.id) : undefined;

    return {
      id: row.id,
      cells: row.cells.map((cell, index) => {
        if (index === 0) {
          return {
            key: cell.key,
            value: labelKey ? intl.get(labelKey) || cell.value : cell.value,
          };
        }
        const number = Number(cell.value);
        return {
          key: cell.key,
          value: cell.value === '' || !Number.isFinite(number) ? '' : formatMoney(number),
        };
      }),
      row_types: types.some((type) => isTotalRow(type))
        ? [...types, 'TOTAL']
        : types,
      children: matrixRows(row.children ?? [], formatMoney),
    };
  });
}

/**
 * Сервер отказал из-за слишком мелкого масштаба на длинном периоде.
 *
 * Эту ошибку «Повторить» не исправит — повтор даст тот же отказ. Человеку
 * нужен другой совет: взять масштаб крупнее или сузить период.
 */
export function isPeriodTooWide(error: unknown): boolean {
  const errors = (error as any)?.response?.data?.errors;
  return (
    Array.isArray(errors) &&
    errors.some((item: any) => item?.type === 'PERIOD_TOO_WIDE_FOR_GRANULARITY')
  );
}

/** Сколько колонок-заглушек рисовать, пока отчёт грузится. */
export function skeletonColumnsCount(query: CashFlowArticlesQuery): number {
  const from = moment(query.fromDate);
  const to = moment(query.toDate);
  if (!from.isValid() || !to.isValid()) return 1;

  const unit: Record<ReportScale, moment.unitOfTime.Diff | null> = {
    day: 'days',
    week: 'weeks',
    month: 'months',
    quarter: 'quarters',
    year: 'years',
    total: null,
  };
  const step = unit[query.dateGroup];
  const count = step ? to.diff(from, step) + 1 : 1;

  // Заглушка лишь намекает на форму таблицы — дюжины колонок хватит.
  return Math.max(1, Math.min(count, 12));
}
