// © 2026 Bigfin
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import intl from 'react-intl-universal';

import ru from '@/lang/ru/index.json';
import {
  formatPeriodLabel,
  isPeriodTooWide,
  matrixColumns,
  matrixRows,
  queryFromSearch,
  searchFromQuery,
  skeletonColumnsCount,
} from './cashFlowArticlesMatrix';

/**
 * Экран матрицы «Деньги по статьям» (FT-001 ТЗ-3) — правила без браузера.
 *
 * Подписи проверяются на НАСТОЯЩЕМ русском словаре: подставная строка
 * проверяла бы саму проверку.
 */
const dictionary: Record<string, string> = ru as any;

beforeEach(() => {
  vi.spyOn(intl, 'get').mockImplementation(((key: string, vars?: any) => {
    const text = dictionary[key] ?? '';
    return text.replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? ''));
  }) as any);
});
afterEach(() => vi.restoreAllMocks());

describe('отбор в адресе страницы', () => {
  it('по умолчанию — текущий год по месяцам', () => {
    expect(queryFromSearch('', '2026-09-23')).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
      dateGroup: 'month',
    });
  });

  it('читает период, масштаб и юрлицо из пересланной ссылки', () => {
    expect(
      queryFromSearch(
        '?fromDate=2021-01-01&toDate=2022-05-31&scale=quarter&legalEntityIds=2',
      ),
    ).toEqual({
      fromDate: '2021-01-01',
      toDate: '2022-05-31',
      dateGroup: 'quarter',
      legalEntityIds: [2],
    });
  });

  it('мусор отбрасывается молча, отчёт строится по умолчанию', () => {
    const query = queryFromSearch(
      '?fromDate=вчера&toDate=2026-02-30&scale=век&legalEntityIds=abc',
      '2026-09-23',
    );

    expect(query).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
      dateGroup: 'month',
    });
  });

  it('конец раньше начала — тоже мусор', () => {
    expect(
      queryFromSearch('?fromDate=2026-05-01&toDate=2026-01-01', '2026-09-23')
        .fromDate,
    ).toBe('2026-01-01');
  });

  it('запись в адрес не теряет чужие параметры, «месяц» не пишется', () => {
    const search = searchFromQuery('?highlight=7&scale=week', {
      fromDate: '2026-01-01',
      toDate: '2026-03-31',
      dateGroup: 'month',
    });
    const params = new URLSearchParams(search);

    expect(params.get('highlight')).toBe('7');
    expect(params.get('scale')).toBeNull();
    expect(params.get('fromDate')).toBe('2026-01-01');
  });

  it('туда и обратно — то же самое', () => {
    const query = {
      fromDate: '2025-04-01',
      toDate: '2026-03-31',
      dateGroup: 'week' as const,
      legalEntityIds: [3],
    };

    expect(queryFromSearch(searchFromQuery('', query))).toEqual(query);
  });
});

describe('подписи колонок-периодов', () => {
  it('месяц — коротко с годом', () => {
    expect(
      formatPeriodLabel({ fromDate: '2026-01-01', toDate: '2026-01-31' }, 'month'),
    ).toMatch(/янв.*2026/);
  });

  it('квартал — по-русски из словаря', () => {
    expect(
      formatPeriodLabel({ fromDate: '2026-04-01', toDate: '2026-06-30' }, 'quarter'),
    ).toBe('2 кв. 2026');
  });

  it('год — просто год', () => {
    expect(
      formatPeriodLabel({ fromDate: '2026-01-01', toDate: '2026-12-31' }, 'year'),
    ).toBe('2026');
  });

  it('обрезанный месяц подписан датами, а не «Январь»', () => {
    const label = formatPeriodLabel(
      { fromDate: '2026-01-15', toDate: '2026-01-31', isPartial: true },
      'month',
    );

    expect(label).toContain('15');
    expect(label).toContain('31');
  });

  it('неделя — диапазон дат', () => {
    expect(
      formatPeriodLabel({ fromDate: '2026-09-21', toDate: '2026-09-27' }, 'week'),
    ).toMatch(/21.*–.*27/);
  });
});

describe('колонки для таблицы', () => {
  const server = [
    { key: 'name', label: 'Статья', cell_index: 0 },
    { key: 'p0', label: 'Январь 2026', cell_index: 1, from_date: '2026-01-01', to_date: '2026-01-31', is_partial: false },
    { key: 'p1', label: 'Февраль 2026', cell_index: 2, from_date: '2026-02-01', to_date: '2026-02-28', is_partial: false },
    { key: 'total', label: 'Итого', cell_index: 3, is_total: true },
  ];

  it('название слева, числа справа, «Итого» подписано', () => {
    const columns = matrixColumns(server, 'month');

    expect(columns.map((c) => [c.key, c.cellIndex, c.align ?? 'left'])).toEqual([
      ['name', 0, 'left'],
      ['p0', 1, 'right'],
      ['p1', 2, 'right'],
      ['total', 3, 'right'],
    ]);
    expect(columns[0].label).toBe('Статья');
    expect(columns[3].label).toBe('Итого');
    expect(columns[1].label).toMatch(/янв/);
  });

  it('понимает и camelCase-псевдонимы полей', () => {
    const [, first] = matrixColumns(
      [
        { key: 'name', label: 'x', cellIndex: 0 },
        { key: 'p0', label: 'x', cellIndex: 1, fromDate: '2026-01-01', toDate: '2026-12-31' },
      ],
      'year',
    );

    expect(first.label).toBe('2026');
  });
});

describe('строки для таблицы', () => {
  const money = (value: number) => `${value} ₽`;
  const rows = matrixRows(
    [
      {
        id: 'opening',
        cells: [{ key: 'name', value: 'Opening' }, { key: 'p0', value: '100' }],
        row_types: ['OPENING'],
      },
      {
        id: 'section-operating',
        cells: [{ key: 'name', value: 'x' }, { key: 'p0', value: '-5' }],
        row_types: ['SECTION'],
        children: [
          {
            id: 'article-7',
            cells: [{ key: 'name', value: 'Аренда офиса' }, { key: 'p0', value: '-5' }],
            row_types: ['ARTICLE'],
          },
        ],
      },
    ],
    money,
  );

  it('итоги помечены TOTAL — жирные, с чертой', () => {
    expect(rows[0].row_types).toContain('TOTAL');
    expect(rows[1].row_types).not.toContain('TOTAL');
  });

  it('служебные строки подписаны на языке интерфейса, статьи — как есть', () => {
    expect(rows[0].cells[0].value).toBe('Остаток на начало');
    expect(rows[1].cells[0].value).toBe('Операционная деятельность');
    expect(rows[1].children![0].cells[0].value).toBe('Аренда офиса');
  });

  it('суммы — в деньгах организации', () => {
    expect(rows[0].cells[1].value).toBe('100 ₽');
    expect(rows[1].children![0].cells[1].value).toBe('-5 ₽');
  });
});

describe('ошибка «слишком много колонок»', () => {
  it('узнаётся по коду сервера', () => {
    const error = {
      response: {
        data: { errors: [{ type: 'PERIOD_TOO_WIDE_FOR_GRANULARITY' }] },
      },
    };

    expect(isPeriodTooWide(error)).toBe(true);
    expect(isPeriodTooWide({ response: { data: { errors: [{ type: 'X' }] } } })).toBe(false);
    expect(isPeriodTooWide(undefined)).toBe(false);
  });
});

describe('заглушка при загрузке', () => {
  it('столько колонок, сколько будет, но не больше дюжины', () => {
    expect(skeletonColumnsCount({ fromDate: '2026-01-01', toDate: '2026-03-31', dateGroup: 'month' })).toBe(3);
    expect(skeletonColumnsCount({ fromDate: '2026-01-01', toDate: '2026-12-31', dateGroup: 'day' })).toBe(12);
    expect(skeletonColumnsCount({ fromDate: '2026-01-01', toDate: '2026-12-31', dateGroup: 'total' })).toBe(1);
  });
});
