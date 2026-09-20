import { describe, expect, it } from 'vitest';

import {
  ARTICLE_KIND_TABS,
  DEFAULT_ARTICLE_KIND,
  countArticlesByKind,
  isSystemArticle,
  kindFromSearch,
  rootsOfKind,
  searchWithKind,
} from './articleKindTabs';
import type { ManagementArticle } from './schemas';

/**
 * Вкладки справочника статей (FIN-001 ТЗ-2).
 *
 * Логика вынесена из компонента нарочно: её можно проверить без браузера, а
 * ошибиться в ней легко — вкладка живёт в адресной строке, и туда попадает
 * что угодно, включая опечатки из пересланной ссылки.
 */
const node = (
  id: number,
  kind: string,
  children: ManagementArticle[] = [],
  seedKey: string | null = null,
): ManagementArticle =>
  ({
    id,
    name: `статья ${id}`,
    kind,
    parentId: null,
    cashflowSection: null,
    seedKey,
    children,
  }) as ManagementArticle;

const forest: ManagementArticle[] = [
  node(1, 'income', [node(2, 'income'), node(3, 'income')]),
  node(4, 'expense', [node(5, 'expense')]),
  node(6, 'asset', [node(7, 'asset', [node(8, 'asset')])]),
  node(9, 'liability'),
];

describe('вкладки справочника статей', () => {
  it('вкладок ровно пять и в понятном человеку порядке', () => {
    // Сначала то, с чем работают каждый день, потом балансовое.
    expect(ARTICLE_KIND_TABS).toEqual([
      'income',
      'expense',
      'asset',
      'liability',
      'equity',
    ]);
  });

  describe('вкладка в адресной строке', () => {
    it('читается из адреса', () => {
      expect(kindFromSearch('?kind=liability')).toBe('liability');
    });

    it('без адреса открывается вкладка по умолчанию', () => {
      expect(kindFromSearch('')).toBe(DEFAULT_ARTICLE_KIND);
    });

    it('ОПЕЧАТКА приводит к вкладке по умолчанию, а не к пустоте', () => {
      // Пустая вкладка читается как «статей такого вида нет», то есть врёт.
      // А показать ошибку некому: ссылку прислали, опечатался не читатель.
      expect(kindFromSearch('?kind=liabilty')).toBe(DEFAULT_ARTICLE_KIND);
      expect(kindFromSearch('?kind=')).toBe(DEFAULT_ARTICLE_KIND);
      expect(kindFromSearch('?kind=<script>')).toBe(DEFAULT_ARTICLE_KIND);
    });

    it('щелчок по вкладке НЕ теряет остальные параметры адреса', () => {
      // Их мог поставить кто-то другой — например, ссылка с подсветкой.
      const next = searchWithKind('?highlight=7&page=2', 'equity');
      const params = new URLSearchParams(next);

      expect(params.get('kind')).toBe('equity');
      expect(params.get('highlight')).toBe('7');
      expect(params.get('page')).toBe('2');
    });

    it('повторный выбор не плодит второй такой же параметр', () => {
      const next = searchWithKind('?kind=income', 'asset');

      expect(next).toBe('?kind=asset');
    });
  });

  describe('счётчики на вкладках', () => {
    it('считают ВСЕ статьи вида, включая вложенные', () => {
      // Число отвечает на вопрос «сколько тут строк», а не «сколько корней»:
      // человек видит на вкладке дерево целиком.
      const counts = countArticlesByKind(forest);

      expect(counts.income).toBe(3);
      expect(counts.expense).toBe(2);
      expect(counts.asset).toBe(3);
      expect(counts.liability).toBe(1);
    });

    it('у пустого вида честный ноль, а не пропуск', () => {
      const counts = countArticlesByKind(forest);

      expect(counts.equity).toBe(0);
      expect(Object.keys(counts).sort()).toEqual([...ARTICLE_KIND_TABS].sort());
    });

    it('без данных все счётчики нулевые и ничего не падает', () => {
      expect(countArticlesByKind()).toEqual({
        income: 0,
        expense: 0,
        asset: 0,
        liability: 0,
        equity: 0,
      });
    });
  });

  describe('что показывается на вкладке', () => {
    it('корни нужного вида — вместе со своими поддеревьями', () => {
      const visible = rootsOfKind(forest, 'asset');

      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe(6);
      expect(visible[0].children?.[0].id).toBe(7);
    });

    it('на пустой вкладке ничего нет', () => {
      expect(rootsOfKind(forest, 'equity')).toEqual([]);
    });
  });

  describe('системная статья', () => {
    it('узнаётся по устойчивому ключу', () => {
      expect(isSystemArticle(node(1, 'asset', [], 'loan_received'))).toBe(true);
    });

    it('заведённая человеком системной не считается', () => {
      expect(isSystemArticle(node(1, 'asset'))).toBe(false);
      expect(isSystemArticle(node(1, 'asset', [], ''))).toBe(false);
    });

    it('переименование системной статьи ничего не меняет', () => {
      // Определяй мы системность по имени — «Кредиты банка» перестали бы
      // быть системными ровно в момент переименования.
      const renamed = {
        ...node(1, 'liability', [], 'loan_received'),
        name: 'Кредиты банка',
      } as ManagementArticle;

      expect(isSystemArticle(renamed)).toBe(true);
    });
  });
});
