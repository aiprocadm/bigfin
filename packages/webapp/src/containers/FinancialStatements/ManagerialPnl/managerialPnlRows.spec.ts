// © 2026 Bigfin
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import intl from 'react-intl-universal';

import ru from '@/lang/ru/index.json';
import {
  formatMargin,
  pnlQueryFromSearch,
  pnlRows,
  pnlSearchFromQuery,
} from './managerialPnlRows';
import { profitLossViewOf } from './profitLossView';

/**
 * Экран управленческого ОПиУ (FT-010, FT-016 ТЗ-3) — правила без браузера,
 * на настоящем русском словаре.
 */
const dictionary: Record<string, string> = ru as any;
beforeEach(() => {
  vi.spyOn(intl, 'get').mockImplementation(((key: string) => dictionary[key] ?? '') as any);
});
afterEach(() => vi.restoreAllMocks());

const row = (id: string, type: string, values: string[], children: any[] = []) => ({
  id,
  cells: [{ key: 'name', value: id }, ...values.map((value, i) => ({ key: `p${i}`, value }))],
  row_types: [type],
  children,
});

const ROWS = [
  row('revenue', 'PL_GROUP', ['1000', '0'], [row('article-1', 'ARTICLE', ['1000', '0'])]),
  row('administrative', 'PL_GROUP', ['250', '100'], [
    row('article-5', 'ARTICLE', ['250', '100']),
  ]),
  row('md', 'PL_TOTAL', ['1000', '0']),
  row('md_margin', 'PL_METRIC', ['100', '']),
  row('unassigned', 'UNASSIGNED', ['-20', '0'], [row('article-9', 'ARTICLE', ['-20', '0'])]),
];

describe('отбор ОПиУ в адресе', () => {
  it('по умолчанию — по начислению, до статей, год по месяцам', () => {
    expect(pnlQueryFromSearch('', '2026-09-23')).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
      dateGroup: 'month',
      basis: 'accrual',
    });
  });

  it('метод, раскрытие и масштаб — из ссылки; «вид» не трогаем', () => {
    const query = pnlQueryFromSearch('?basis=cash&group=directions&scale=quarter', '2026-09-23');
    expect(query).toMatchObject({ basis: 'cash', group: 'directions', dateGroup: 'quarter' });

    const search = new URLSearchParams(pnlSearchFromQuery('?view=managerial', query));
    expect(search.get('view')).toBe('managerial');
    expect(search.get('basis')).toBe('cash');
  });

  it('группировка «Денег» (контрагенты) у ОПиУ не принимается', () => {
    expect(pnlQueryFromSearch('?group=contacts', '2026-09-23').group).toBeUndefined();
  });
});

describe('строки ОПиУ', () => {
  const money = (value: number) => `${value} ₽`;

  it('рентабельность — проценты; пусто с сервера — «н/о», а не «0 %»', () => {
    expect(formatMargin('79.03')).toBe('79,03 %');
    expect(formatMargin('')).toBe('н/о');
    const { rows } = pnlRows(ROWS, money);
    const margin = rows.find((r) => r.id === 'md_margin')!;
    expect(margin.cells.map((c) => c.value)).toEqual(['Рентабельность по МД', '100,00 %', 'н/о']);
  });

  it('итоги ярусов — жирные (TOTAL) и с подсказкой-формулой', () => {
    const { rows } = pnlRows(ROWS, money);
    const md = rows.find((r) => r.id === 'md')!;

    expect(md.row_types).toContain('TOTAL');
    expect(md.hint).toContain('МД = Выручка − Прямые переменные');
    expect(rows.find((r) => r.id === 'revenue')!.hint).toBeUndefined();
  });

  it('доля от выручки своей колонки — под группами и статьями', () => {
    const { rows } = pnlRows(ROWS, money, { showPercent: true });
    const admin = rows.find((r) => r.id === 'administrative')!;

    expect(admin.cells[1].note).toBe('25,00 %');
    // Февраль без выручки: доли не определены.
    expect(admin.cells[2].note).toBe('н/о');
    expect(rows.find((r) => r.id === 'md')!.cells[1].note).toBeUndefined();
  });

  it('раскрытие: группа — ярус целиком, статья — в своём ярусе; итоги и «не отнесено» — нет', () => {
    const { drills } = pnlRows(ROWS, money);

    expect(drills.get('administrative')).toEqual({ plType: 'administrative' });
    expect(drills.get('article-5')).toEqual({ plType: 'administrative', articleId: 5 });
    expect(drills.has('md')).toBe(false);
    expect(drills.has('md_margin')).toBe(false);
    expect(drills.has('article-9')).toBe(false);
  });

  it('раскрытие по направлениям: направление и статья внутри; «без» — нет', () => {
    const { drills } = pnlRows(
      [
        row('revenue', 'PL_GROUP', ['10'], [
          row('revenue-direction-3', 'DIRECTION', ['6'], [
            row('direction-3-article-1', 'ARTICLE', ['6']),
          ]),
          row('revenue-direction-none', 'DIRECTION', ['4'], [
            row('direction-none-article-1', 'ARTICLE', ['4']),
          ]),
        ]),
      ],
      money,
    );

    expect(drills.get('revenue-direction-3')).toEqual({ plType: 'revenue', projectsIds: [3] });
    expect(drills.get('direction-3-article-1')).toEqual({
      plType: 'revenue',
      articleId: 1,
      projectsIds: [3],
    });
    expect(drills.has('revenue-direction-none')).toBe(false);
    expect(drills.has('direction-none-article-1')).toBe(false);
  });
});

describe('какой ОПиУ открыть', () => {
  it('выбор в адресе важнее режима интерфейса', () => {
    expect(profitLossViewOf('?view=accounting', false)).toBe('accounting');
    expect(profitLossViewOf('?view=managerial', true)).toBe('managerial');
  });

  it('без выбора: «Бизнес» — управленческий, «Бухгалтер» — бухгалтерский', () => {
    expect(profitLossViewOf('', false)).toBe('managerial');
    expect(profitLossViewOf('', true)).toBe('accounting');
  });
});
