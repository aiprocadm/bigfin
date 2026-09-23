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

/** Шесть группировок строк (FT-002 ТЗ-3) — в том же порядке, что вкладки. */
export const CASHFLOW_GROUPINGS = [
  'articles',
  'activity',
  'contacts',
  'accounts',
  'directions',
  'directions_articles',
] as const;

export type CashFlowGrouping = (typeof CASHFLOW_GROUPINGS)[number];

/** Отбор отчёта так, как он живёт в адресе страницы. */
export interface CashFlowArticlesQuery {
  fromDate: string;
  toDate: string;
  dateGroup: ReportScale;
  /** Группировка строк; по умолчанию статьи. */
  group?: CashFlowGrouping;
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

  const rawGroup = params.get('group');
  const group = (CASHFLOW_GROUPINGS as readonly string[]).includes(rawGroup ?? '')
    ? (rawGroup as CashFlowGrouping)
    : undefined;

  return {
    fromDate,
    toDate,
    dateGroup,
    ...(group && group !== 'articles' ? { group } : {}),
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
  // Группировка по умолчанию («статьи») в адрес не пишется, как и месяц.
  if (query.group && query.group !== 'articles') {
    params.set('group', query.group);
  } else {
    params.delete('group');
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
  showWeekdays = false,
): string {
  const from = moment(column.fromDate, 'YYYY-MM-DD');
  const to = moment(column.toDate, 'YYYY-MM-DD');
  if (!from.isValid() || !to.isValid()) return '';

  const fmt = (value: moment.Moment, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(value.toDate());
  const dayMonth = { day: 'numeric', month: 'short' } as const;

  if (dateGroup === 'day') {
    // День недели — по настройке организации (FT-006b): «пн, 5 янв.».
    return fmt(from, {
      ...dayMonth,
      year: 'numeric',
      ...(showWeekdays ? { weekday: 'short' as const } : {}),
    });
  }

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

/** Календарь организации в том виде, в каком его знает витрина. */
export interface OrganizationCalendarView {
  highlightWeekends?: boolean;
  showWeekdays?: boolean;
}

/** Суббота или воскресенье. */
const isWeekendDate = (date: string): boolean => {
  const day = moment(date, 'YYYY-MM-DD').isoWeekday();
  return day === 6 || day === 7;
};

/** Колонки матрицы для ReportTable: название слева, числа справа. */
export function matrixColumns(
  serverColumns: MatrixServerColumn[] = [],
  dateGroup: ReportScale,
  locale = 'ru',
  calendar: OrganizationCalendarView = {},
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
              Boolean(calendar.showWeekdays),
            )
          : column.label,
      cellIndex,
      align: 'right' as const,
      // Выходной подсвечивается только у колонки-дня: «выходная неделя» —
      // бессмыслица. По умолчанию подсветка есть, как в платёжном календаре.
      highlight:
        dateGroup === 'day' &&
        calendar.highlightWeekends !== false &&
        Boolean(fromDate && isWeekendDate(fromDate)),
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

/**
 * Ключ подписи строки. Группы «Поступления / Выплаты» узнаются по ВИДУ
 * строки, а не по ключу: ключ `inflow-contact-12` — это контрагент внутри
 * поступлений, и подписать его «Поступления» значило бы стереть его имя.
 */
const rowLabelKey = (id: string, rowType: string): string | undefined => {
  if (ROW_LABEL_KEYS[id]) return ROW_LABEL_KEYS[id];
  if (rowType === 'INFLOW') return 'cash_flow_articles.inflow';
  if (rowType === 'OUTFLOW') return 'cash_flow_articles.outflow';
  if (id.endsWith('contact-none')) return 'cash_flow_articles.no_contact';
  if (id.endsWith('direction-none')) return 'cash_flow_articles.no_direction';
  return undefined;
};

/** Строка таблицы, как её присылает сервер (оба написания полей). */
export interface MatrixServerRow {
  id?: string;
  cells: Array<{ key: string; value: string; note?: string }>;
  row_types?: string[];
  rowTypes?: string[];
  children?: MatrixServerRow[];
}

const typeOf = (row: MatrixServerRow): string =>
  (row.rowTypes ?? row.row_types ?? [])[0] ?? '';

/**
 * Итоги поступлений и выплат каждой колонки — по ВЕРХНИМ группам.
 *
 * Внутри группы «Поступления» лежат статьи, уже вошедшие в её сумму; группы
 * по разделам деятельности или по направлениям складываются между собой.
 */
export function flowTotalsByCell(rows: MatrixServerRow[] = []): {
  inflow: number[];
  outflow: number[];
} {
  const inflow: number[] = [];
  const outflow: number[] = [];
  const add = (target: number[], row: MatrixServerRow) =>
    row.cells.forEach((cell, index) => {
      if (index === 0) return;
      target[index] = (target[index] ?? 0) + (Number(cell.value) || 0);
    });
  const walk = (list: MatrixServerRow[]) =>
    list.forEach((row) => {
      const type = typeOf(row);
      if (type === 'INFLOW') add(inflow, row);
      else if (type === 'OUTFLOW') add(outflow, row);
      else walk(row.children ?? []);
    });
  walk(rows ?? []);
  return { inflow, outflow };
}

/**
 * Доля строки от итога поступлений или выплат колонки (FT-003 ТЗ-3).
 *
 * Итог ноль или меньше — доли нет: «0 %» соврало бы, что статья ничего не
 * весит. Если и сама сумма ноль — не пишем ничего: колонка без поступлений
 * не должна пестреть пометками. Если сумма есть, а итога нет (возвраты
 * перевесили) — «н/о», «не определено».
 */
export function formatShare(
  value: number,
  total: number,
  locale = 'ru',
): string | undefined {
  if (!(total > 0)) {
    return value === 0 ? undefined : intl.get('reports.percent.not_applicable');
  }
  const percent = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((value / total) * 100);
  return `${percent} %`;
}

/**
 * Строки сервера → строки ReportTable: суммы в деньгах организации, итоги
 * помечены как TOTAL (жирным, с чертой сверху), под суммами поступлений и
 * выплат — доля от итога колонки, если её просили.
 */
export function matrixRows(
  rows: MatrixServerRow[] = [],
  formatMoney: (value: number) => string,
  options: { showPercent?: boolean; locale?: string } = {},
): ReportTableRow[] {
  const totals = options.showPercent ? flowTotalsByCell(rows) : null;

  const map = (
    list: MatrixServerRow[],
    side: 'inflow' | 'outflow' | null,
  ): ReportTableRow[] =>
    (list ?? []).map((row) => {
      const types = row.rowTypes ?? row.row_types ?? [];
      const type = types[0] ?? '';
      const rowSide =
        type === 'INFLOW' ? 'inflow' : type === 'OUTFLOW' ? 'outflow' : side;
      const labelKey = row.id ? rowLabelKey(row.id, type) : undefined;

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
          const valid = cell.value !== '' && Number.isFinite(number);
          const note =
            totals && rowSide && valid
              ? formatShare(number, totals[rowSide][index] ?? 0, options.locale)
              : undefined;
          return {
            key: cell.key,
            value: valid ? formatMoney(number) : '',
            ...(note ? { note } : {}),
          };
        }),
        row_types: types.some((t) => isTotalRow(t)) ? [...types, 'TOTAL'] : types,
        children: map(row.children ?? [], rowSide),
      };
    });

  return map(rows, null);
}

/** Границы каждой колонки — чтобы раскрыть ячейку ровно за её период. */
export function columnBounds(
  serverColumns: MatrixServerColumn[] = [],
  query: Pick<CashFlowArticlesQuery, 'fromDate' | 'toDate'>,
): Record<string, { fromDate: string; toDate: string }> {
  const bounds: Record<string, { fromDate: string; toDate: string }> = {};
  (serverColumns ?? []).forEach((column, index) => {
    if (index === 0) return;
    const fromDate = column.fromDate ?? column.from_date;
    const toDate = column.toDate ?? column.to_date;
    bounds[column.key] =
      fromDate && toDate
        ? { fromDate, toDate }
        // «Итого» — весь отчёт.
        : { fromDate: query.fromDate, toDate: query.toDate };
  });
  return bounds;
}

/**
 * Что раскрывать по ячейке (FT-004 ТЗ-3): статья и, если строка внутри
 * направления, само направление. `null` — ячейка не раскрывается.
 *
 * Раскрываются только строки-статьи: у итогов и групп своих операций нет, а
 * у «Без направления» нечем отобрать «без» на сервере — панель показала бы
 * операции всех направлений и не сошлась бы с ячейкой.
 */
export function drillOfRow(
  rowId: string | number | undefined,
): { articleId: number; projectsIds?: number[] } | null {
  const id = String(rowId ?? '');
  const inDirection = /^direction-(\d+)-article-(\d+)$/.exec(id);
  if (inDirection) {
    return {
      articleId: Number(inDirection[2]),
      projectsIds: [Number(inDirection[1])],
    };
  }
  const plain = /^article-(\d+)$/.exec(id);
  return plain ? { articleId: Number(plain[1]) } : null;
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
