// © 2026 Bigfin
import {
  ArticleReportMap,
  ReportMapNode,
  buildArticleReportMap,
} from './buildArticleReportMap';

/**
 * Схема «Куда попадает статья» (FIN-002 ТЗ-2).
 *
 * Здесь проверяется обещание, которое схема даёт человеку: «твои суммы
 * окажутся вот в этой строке». Обещание неверное хуже отсутствия схемы —
 * человек разнесёт операцию, поверив подсветке, и не найдёт её в отчёте.
 */
const article = (
  kind: string,
  cashflowSection: string | null = 'operating',
  hasAccounts = true,
) => ({ id: 1, name: 'Статья', kind, cashflowSection, hasAccounts });

/** Все подсвеченные строки схемы — плоским списком ключей. */
const highlighted = (nodes: ReportMapNode[], prefix = ''): string[] =>
  nodes.flatMap((item) => {
    const path = prefix ? `${prefix}.${item.key}` : item.key;
    const self = item.isHighlighted ? [path] : [];

    return [...self, ...highlighted(item.children ?? [], path)];
  });

const mapOf = (input: any): ArticleReportMap => buildArticleReportMap(input);

describe('схема «куда попадает статья»', () => {
  describe('структура показывается всегда', () => {
    it('без выбранной статьи схема есть, подсветки нет', () => {
      // Пустой экран не объясняет ничего. Схема без подсветки объясняет
      // устройство отчётов — это уже польза.
      const map = mapOf(null);

      expect(map.cashFlow).toHaveLength(3);
      expect(map.profitLoss.length).toBeGreaterThan(0);
      expect(map.balance.length).toBeGreaterThan(0);
      expect(map.highlights).toEqual([]);
      expect(map.warning).toBeNull();
    });

    it('в балансе есть строка равенства', () => {
      // Именно она объясняет, зачем нужны три балансовых вида статей.
      const keys = mapOf(null).balance.map((item) => item.key);

      expect(keys).toContain('equation');
    });
  });

  describe('расходная статья', () => {
    const map = mapOf(article('expense', 'operating'));

    it('подсвечивает ровно одну строку в прибыли', () => {
      expect(highlighted(map.profitLoss)).toEqual(['expense']);
    });

    it('подсвечивает выплаты операционного раздела в деньгах', () => {
      expect(highlighted(map.cashFlow)).toEqual(['operating.outflow']);
    });

    it('в балансе НЕ подсвечивает ничего', () => {
      expect(highlighted(map.balance)).toEqual([]);
    });
  });

  describe('доходная статья', () => {
    it('подсвечивает поступления, а не выплаты', () => {
      const map = mapOf(article('income', 'operating'));

      expect(highlighted(map.cashFlow)).toEqual(['operating.inflow']);
      expect(highlighted(map.profitLoss)).toEqual(['income']);
    });
  });

  describe('балансовая статья', () => {
    it('обязательство: баланс и деньги, но НЕ прибыль', () => {
      // Получение кредита — не выручка. Подсветь мы строку прибыли, человек
      // решил бы, что кредит увеличит его прибыль.
      const map = mapOf(article('liability', 'financing'));

      expect(highlighted(map.balance)).toEqual(['liabilities']);
      expect(highlighted(map.cashFlow)).toEqual(['financing.inflow']);
      expect(highlighted(map.profitLoss)).toEqual([]);
    });

    it('актив уходит в ВЫПЛАТЫ: покупка станка — это деньги наружу', () => {
      const map = mapOf(article('asset', 'investing'));

      expect(highlighted(map.cashFlow)).toEqual(['investing.outflow']);
      expect(highlighted(map.balance)).toEqual(['assets']);
    });

    it('капитал: взнос собственника — приток в финансовом разделе', () => {
      const map = mapOf(article('equity', 'financing'));

      expect(highlighted(map.cashFlow)).toEqual(['financing.inflow']);
      expect(highlighted(map.balance)).toEqual(['equity']);
      expect(highlighted(map.profitLoss)).toEqual([]);
    });
  });

  describe('статья без привязанных счетов', () => {
    it('НЕ подсвечивает ничего и говорит почему', () => {
      // Подсветка здесь была бы обещанием, которое продукт не выполнит:
      // суммам просто неоткуда взяться.
      const map = mapOf(article('expense', 'operating', false));

      expect(map.warning).toBe('NO_ACCOUNTS');
      expect(map.highlights).toEqual([]);
      expect(highlighted(map.cashFlow)).toEqual([]);
      expect(highlighted(map.profitLoss)).toEqual([]);
    });
  });

  describe('вырожденные случаи', () => {
    it('статья без раздела считается операционной, а не пропадает', () => {
      const map = mapOf(article('expense', null));

      expect(highlighted(map.cashFlow)).toEqual(['operating.outflow']);
    });

    it('мусор в разделе не ломает схему', () => {
      const map = mapOf(article('expense', 'квартальная'));

      expect(highlighted(map.cashFlow)).toEqual(['operating.outflow']);
    });
  });
});
