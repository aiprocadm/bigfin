import { describe, expect, it } from 'vitest';

import {
  defaultExpandedIds,
  flattenReportRows,
  isTotalRow,
  ReportTableRow,
} from './cashFlowArticlesRows';

/**
 * Строки отчёта «Деньги (ДДС по статьям)» на витрине.
 *
 * Правил тут два, и оба легко сломать незаметно: что раскрыто при открытии
 * и какие строки считаются итоговыми. Ошибка в первом даёт либо «пустой»
 * отчёт из трёх строк, либо простыню на сотню статей.
 */
const rows: ReportTableRow[] = [
  {
    id: 'opening',
    cells: [
      { key: 'name', value: 'Остаток на начало' },
      { key: 'amount', value: '200000' },
    ],
    rowTypes: ['OPENING'],
    children: [],
  },
  {
    id: 'section-operating',
    cells: [
      { key: 'name', value: 'Операционная деятельность' },
      { key: 'amount', value: '320000' },
    ],
    rowTypes: ['SECTION'],
    children: [
      {
        id: 'inflow-operating',
        cells: [
          { key: 'name', value: 'Поступления' },
          { key: 'amount', value: '500000' },
        ],
        rowTypes: ['INFLOW'],
        children: [
          {
            id: 'article-1',
            cells: [
              { key: 'name', value: 'Доходы' },
              { key: 'amount', value: '500000' },
            ],
            rowTypes: ['ARTICLE'],
            children: [
              {
                id: 'article-2',
                cells: [
                  { key: 'name', value: 'Выручка' },
                  { key: 'amount', value: '500000' },
                ],
                rowTypes: ['ARTICLE'],
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

describe('строки отчёта о движении денег', () => {
  describe('что раскрыто при открытии', () => {
    it('разделы и группы «Поступления / Выплаты» раскрыты', () => {
      // Иначе человек видит три строки и решает, что отчёт пустой.
      const expanded = defaultExpandedIds(rows);

      expect(expanded.has('section-operating')).toBe(true);
      expect(expanded.has('inflow-operating')).toBe(true);
    });

    it('дерево статей СВЁРНУТО', () => {
      // Статей бывают десятки: развернув всё сразу, мы показали бы
      // простыню вместо ответа.
      const expanded = defaultExpandedIds(rows);

      expect(expanded.has('article-1')).toBe(false);
      expect(expanded.has('article-2')).toBe(false);
    });
  });

  describe('разворачивание в плоский список', () => {
    it('свёрнутая строка отдаёт себя, но не детей', () => {
      const visible = flattenReportRows(rows, defaultExpandedIds(rows));
      const names = visible.map((row) => row.name);

      expect(names).toEqual([
        'Остаток на начало',
        'Операционная деятельность',
        'Поступления',
        'Доходы',
      ]);
      // «Выручка» скрыта: её родитель свёрнут.
      expect(names).not.toContain('Выручка');
    });

    it('раскрытая статья показывает поддерево', () => {
      const expanded = defaultExpandedIds(rows);
      expanded.add('article-1');
      const names = flattenReportRows(rows, expanded).map((row) => row.name);

      expect(names).toContain('Выручка');
    });

    it('уровень вложенности растёт, а не теряется', () => {
      const expanded = defaultExpandedIds(rows);
      expanded.add('article-1');
      const visible = flattenReportRows(rows, expanded);
      const byName = Object.fromEntries(
        visible.map((row) => [row.name, row.level]),
      );

      expect(byName['Операционная деятельность']).toBe(0);
      expect(byName['Поступления']).toBe(1);
      expect(byName['Доходы']).toBe(2);
      expect(byName['Выручка']).toBe(3);
    });

    it('суммы приходят ЧИСЛАМИ, а не строками', () => {
      // Иначе их не отформатировать деньгами и не сравнить между собой.
      const visible = flattenReportRows(rows, defaultExpandedIds(rows));

      expect(visible[0].amount).toBe(200000);
      expect(typeof visible[0].amount).toBe('number');
    });

    it('пустая сумма остаётся пустой, а не превращается в ноль', () => {
      // Ноль — это утверждение «движения не было». Отсутствие суммы —
      // другое: у строки её просто нет.
      const visible = flattenReportRows(
        [
          {
            id: 'x',
            cells: [
              { key: 'name', value: 'Заголовок' },
              { key: 'amount', value: '' },
            ],
            rowTypes: ['SECTION'],
          },
        ],
        new Set(),
      );

      expect(visible[0].amount).toBeNull();
    });

    it('пустой отчёт не роняет разворачивание', () => {
      expect(flattenReportRows([], new Set())).toEqual([]);
      expect(flattenReportRows(undefined as any, new Set())).toEqual([]);
    });
  });

  describe('итоговые строки', () => {
    it('остатки, чистый поток и «не разнесено» — итоговые', () => {
      ['OPENING', 'CLOSING', 'NET', 'UNCLASSIFIED'].forEach((rowType) => {
        expect(isTotalRow(rowType)).toBe(true);
      });
    });

    it('статья и раздел итоговыми не считаются', () => {
      expect(isTotalRow('ARTICLE')).toBe(false);
      expect(isTotalRow('SECTION')).toBe(false);
    });
  });
});
