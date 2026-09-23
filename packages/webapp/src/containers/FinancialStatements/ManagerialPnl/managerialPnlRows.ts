import intl from 'react-intl-universal';

import type { ReportTableRow } from '@/components/ui/report-table';
import { formulaHintOf } from '../reportFormulas';
import {
  queryFromSearch as cashQueryFromSearch,
  type CashFlowArticlesQuery,
} from '../CashFlowArticles/cashFlowArticlesMatrix';

/**
 * Управленческий ОПиУ (FT-010 ТЗ-3) — подготовка к показу, без React.
 */

export const PNL_GROUPINGS = ['articles', 'directions', 'directions_articles'] as const;
export type PnlGrouping = (typeof PNL_GROUPINGS)[number];
export type PnlBasis = 'accrual' | 'cash';

/** Базы распределения косвенных (FT-011 ТЗ-3) — как на сервере. */
export const SPREAD_BASES = [
  'revenue',
  'production_payroll',
  'gross_profit_1',
  'equal',
  'manual_share',
] as const;
export type SpreadBase = (typeof SPREAD_BASES)[number];

export interface ManagerialPnlQuery
  extends Omit<CashFlowArticlesQuery, 'group'> {
  basis: PnlBasis;
  group?: PnlGrouping;
  /** Распределить косвенные по направлениям (FT-011 ТЗ-3). */
  spreadIndirect?: boolean;
  spreadBase?: SpreadBase;
}

/**
 * Отбор из адреса: период, масштаб и юрлицо — как у «Денег», плюс метод
 * учёта и раскрытие ярусов. По умолчанию — по начислению и до статей.
 */
export function pnlQueryFromSearch(
  search: string,
  today?: string,
): ManagerialPnlQuery {
  const params = new URLSearchParams(search);
  // Группировку «Денег» не берём: у ОПиУ свой набор раскрытий.
  params.delete('group');
  const { group: _cashGroup, ...base } = cashQueryFromSearch(
    `?${params.toString()}`,
    today,
  );
  const basis = params.get('basis') === 'cash' ? 'cash' : 'accrual';
  const rawGroup = new URLSearchParams(search).get('group');
  const group = (PNL_GROUPINGS as readonly string[]).includes(rawGroup ?? '')
    ? (rawGroup as PnlGrouping)
    : undefined;

  const spreadIndirect = params.get('spread') === '1';
  const rawBase = params.get('spreadBase');
  const spreadBase = (SPREAD_BASES as readonly string[]).includes(rawBase ?? '')
    ? (rawBase as SpreadBase)
    : undefined;

  return {
    ...base,
    basis,
    ...(group && group !== 'articles' ? { group } : {}),
    ...(spreadIndirect ? { spreadIndirect: true } : {}),
    ...(spreadBase && spreadBase !== 'revenue' ? { spreadBase } : {}),
  };
}

/** Пишет отбор в адрес, не трогая чужие параметры (в том числе `view`). */
export function pnlSearchFromQuery(search: string, query: ManagerialPnlQuery): string {
  const params = new URLSearchParams(search);
  params.set('fromDate', query.fromDate);
  params.set('toDate', query.toDate);
  const setOrDelete = (key: string, value: string | undefined, fallback: string) =>
    value && value !== fallback ? params.set(key, value) : params.delete(key);
  setOrDelete('scale', query.dateGroup, 'month');
  setOrDelete('basis', query.basis, 'accrual');
  setOrDelete('group', query.group, 'articles');
  setOrDelete('spread', query.spreadIndirect ? '1' : undefined, '');
  setOrDelete('spreadBase', query.spreadBase, 'revenue');
  params.delete('legalEntityIds');
  (query.legalEntityIds ?? []).forEach((id) => params.append('legalEntityIds', String(id)));
  const result = params.toString();
  return result ? `?${result}` : '';
}

/** Что раскрывать по ячейке: ярус целиком, статья в ярусе, направление. */
export interface PnlDrill {
  plType: string;
  articleId?: number;
  projectsIds?: number[];
}

interface ServerRow {
  id?: string;
  cells: Array<{ key: string; value: string }>;
  row_types?: string[];
  rowTypes?: string[];
  children?: ServerRow[];
}

const typeOf = (row: ServerRow) => (row.rowTypes ?? row.row_types ?? [])[0] ?? '';

/**
 * Рентабельность: число процентов или «н/о». Пустая ячейка сервера значит
 * «не определено» (выручка ноль или меньше) — «0 %» здесь соврало бы.
 */
export function formatMargin(raw: string, locale = 'ru'): string {
  if (raw === '' || raw === null || raw === undefined) {
    return intl.get('reports.percent.not_applicable');
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) return intl.get('reports.percent.not_applicable');
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} %`;
}

/** Доля от выручки своей колонки (FT-003 ТЗ-3): «в ОПиУ — от Выручки». */
function shareOfRevenue(value: number, revenue: number, locale: string) {
  if (value === 0) return undefined;
  if (!(revenue > 0)) return intl.get('reports.percent.not_applicable');
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((value / revenue) * 100)} %`;
}

/**
 * Строки сервера → строки таблицы: деньги в валюте организации, проценты
 * рентабельности, итоги жирным, подсказки-формулы у расчётных строк, доля
 * от выручки под суммами групп и статей. Заодно — что раскрывается.
 */
export function pnlRows(
  rows: ServerRow[] = [],
  formatMoney: (value: number) => string,
  options: { showPercent?: boolean; locale?: string } = {},
): { rows: ReportTableRow[]; drills: Map<string, PnlDrill> } {
  const locale = options.locale ?? 'ru';
  const drills = new Map<string, PnlDrill>();
  const revenueRow = rows.find((row) => row.id === 'revenue');
  const revenueByCell = (index: number) =>
    Number(revenueRow?.cells[index]?.value ?? 0) || 0;

  const map = (list: ServerRow[], tier: string | null): ReportTableRow[] =>
    list.map((row) => {
      const type = typeOf(row);
      const id = row.id ?? '';
      const rowTier = type === 'PL_GROUP' ? id : tier;
      const isMetric = type === 'PL_METRIC';
      const withShare =
        options.showPercent && (type === 'PL_GROUP' || type === 'ARTICLE' || type === 'DIRECTION') && rowTier;

      // Раскрытие: группа — ярус целиком; статья — в своём ярусе; строка
      // направления — ярус этого направления. «Без направления» и строки
      // «Не отнесено» не раскрываются: на сервере нечем отобрать «без», а
      // итог панели обязан совпасть с ячейкой.
      if (rowTier && type === 'PL_GROUP') drills.set(id, { plType: rowTier });
      const article = /(?:^|direction-(\d+)-)article-(\d+)$/.exec(id);
      if (rowTier && type === 'ARTICLE' && article && !id.startsWith('direction-none')) {
        drills.set(id, {
          plType: rowTier,
          articleId: Number(article[2]),
          ...(article[1] ? { projectsIds: [Number(article[1])] } : {}),
        });
      }
      const direction = /-direction-(\d+)$/.exec(id);
      if (rowTier && type === 'DIRECTION' && direction) {
        drills.set(id, { plType: rowTier, projectsIds: [Number(direction[1])] });
      }

      const labelKey = row.cells[0]?.value;
      return {
        id,
        hint: formulaHintOf(id),
        cells: row.cells.map((cell, index) => {
          if (index === 0) {
            const key = managerialLabelKey(id);
            return { key: cell.key, value: (key && intl.get(key)) || labelKey };
          }
          if (isMetric) return { key: cell.key, value: formatMargin(cell.value, locale) };
          const number = Number(cell.value);
          const valid = cell.value !== '' && Number.isFinite(number);
          const note = withShare && valid ? shareOfRevenue(number, revenueByCell(index), locale) : undefined;
          return {
            key: cell.key,
            value: valid ? formatMoney(number) : '',
            ...(note ? { note } : {}),
          };
        }),
        row_types:
          type === 'PL_TOTAL'
            ? ['PL_TOTAL', 'TOTAL']
            : row.rowTypes ?? row.row_types ?? [],
        children: map(row.children ?? [], rowTier),
      };
    });

  return { rows: map(rows, null), drills };
}

/** Подпись строки лестницы на языке интерфейса; статьи — как есть. */
function managerialLabelKey(id: string): string | undefined {
  const LADDER = new Set([
    'revenue', 'direct_variable', 'md', 'md_margin', 'direct_production', 'gp1',
    'gp1_margin', 'overhead_production', 'gp2', 'gp2_margin', 'administrative',
    'commercial', 'op', 'op_margin', 'other_income_below_ebitda', 'below_ebitda',
    'np', 'np_margin', 'below_net_profit', 'unassigned',
  ]);
  if (LADDER.has(id)) return `managerial_pnl.row.${id}`;
  if (id.endsWith('-direction-none')) return 'cash_flow_articles.no_direction';
  return undefined;
}
