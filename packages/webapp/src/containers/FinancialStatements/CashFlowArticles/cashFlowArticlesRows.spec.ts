import { describe, expect, it } from 'vitest';

import { defaultExpandedPaths } from '@/components/ui/report-table';
import { isTotalRow } from './cashFlowArticlesRows';

/**
 * Строки отчёта «Деньги (ДДС по статьям)»: итоги и раскрытие при открытии.
 *
 * С этапа 30 экран рисует общая таблица отчётов с глубиной раскрытия 2.
 * Правило осталось прежним, и проверяется оно здесь, на дереве строк
 * этого отчёта: разделы и группы «Поступления / Выплаты» раскрыты, дерево
 * статей свёрнуто — у организации статей бывают десятки.
 */
const row = (id: string, children: any[] = []) => ({
  id,
  cells: [{ key: 'name', value: id }],
  children,
});

const ROWS = [
  row('opening'),
  row('section-operating', [
    row('inflow-operating', [row('article-1', [row('article-2')])]),
    row('outflow-operating', [row('article-3')]),
  ]),
  row('net'),
  row('closing'),
];

/** Путь строки в дереве → её ключ. */
const idsOf = (paths: Set<string>) => {
  const out: string[] = [];
  const walk = (list: any[], parent: string | null) =>
    list.forEach((item, index) => {
      const path = parent ? `${parent}.${index}` : `${index}`;
      if (paths.has(path) && item.children.length) out.push(item.id);
      walk(item.children, path);
    });
  walk(ROWS, null);
  return out;
};

describe('строки отчёта о движении денег', () => {
  describe('что раскрыто при открытии (глубина 2, как на экране)', () => {
    it('разделы и группы «Поступления / Выплаты» раскрыты', () => {
      const expanded = idsOf(defaultExpandedPaths(ROWS, 2));

      expect(expanded).toContain('section-operating');
      expect(expanded).toContain('inflow-operating');
      expect(expanded).toContain('outflow-operating');
    });

    it('дерево статей СВЁРНУТО', () => {
      expect(idsOf(defaultExpandedPaths(ROWS, 2))).not.toContain('article-1');
    });
  });

  describe('итоговые строки', () => {
    it('остатки, чистый поток и «не разнесено» — итоговые', () => {
      ['OPENING', 'CLOSING', 'NET', 'UNCLASSIFIED'].forEach((type) =>
        expect(isTotalRow(type)).toBe(true),
      );
    });

    it('статья и раздел итоговыми не считаются', () => {
      ['ARTICLE', 'SECTION', 'INFLOW'].forEach((type) =>
        expect(isTotalRow(type)).toBe(false),
      );
    });
  });
});
