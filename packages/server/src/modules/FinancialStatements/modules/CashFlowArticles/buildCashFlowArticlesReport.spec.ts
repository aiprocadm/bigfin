// © 2026 Bigfin
import {
  buildCashFlowArticlesReport,
  INFLOW_ARTICLE_KINDS,
  OUTFLOW_ARTICLE_KINDS,
  ReportArticle,
} from './buildCashFlowArticlesReport';

/**
 * Отчёт «Деньги (ДДС по статьям)» — расчёт (FIN-013 ТЗ-2).
 *
 * Главное здесь — равенство «остаток на начало + чистый поток = остаток на
 * конец». Расхождение в отчёте о деньгах это не косметика: человек сверяет
 * его с банковской выпиской, не сходится — перестаёт верить продукту
 * целиком, включая те отчёты, которые верны.
 */
const article = (
  id: number,
  name: string,
  kind: string,
  cashflowSection: string | null,
  parentId: number | null = null,
): ReportArticle => ({ id, name, kind, cashflowSection, parentId });

const articles: ReportArticle[] = [
  article(1, 'Доходы', 'income', 'operating'),
  article(2, 'Выручка', 'income', 'operating', 1),
  article(3, 'Расходы', 'expense', 'operating'),
  article(4, 'Аренда', 'expense', 'operating', 3),
  article(5, 'Активы', 'asset', 'investing'),
  article(6, 'Покупка оборудования', 'asset', 'investing', 5),
  article(7, 'Обязательства', 'liability', 'financing'),
  article(8, 'Получение кредита', 'liability', 'financing', 7),
];

/** Свёртка уже поднимает суммы детей в родителя — как в проекте. */
const amounts = [
  { id: 1, amount: 500_000 },
  { id: 2, amount: 500_000 },
  { id: 3, amount: 180_000 },
  { id: 4, amount: 180_000 },
  { id: 5, amount: 300_000 },
  { id: 6, amount: 300_000 },
  { id: 7, amount: 1_000_000 },
  { id: 8, amount: 1_000_000 },
];

describe('отчёт «Деньги (ДДС по статьям)»', () => {
  describe('направление выводится из вида статьи', () => {
    it('приток и отток покрывают все пять видов и не пересекаются', () => {
      const all = [...INFLOW_ARTICLE_KINDS, ...OUTFLOW_ARTICLE_KINDS].sort();

      expect(all).toEqual(
        ['asset', 'equity', 'expense', 'income', 'liability'].sort(),
      );
    });

    it('доход, обязательство и капитал — приток; расход и актив — отток', () => {
      // Не угадывание по знаку: вид статьи обязан совпадать с корневым
      // типом привязанных счетов, а тот задаёт нормальную сторону.
      const report = buildCashFlowArticlesReport({
        articles,
        amounts,
        openingBalance: 0,
        closingBalance: 1_020_000,
      });

      const operating = report.sections.find((s) => s.section === 'operating')!;
      expect(operating.inflow.total).toBe(500_000);
      expect(operating.outflow.total).toBe(180_000);

      const investing = report.sections.find((s) => s.section === 'investing')!;
      expect(investing.inflow.total).toBe(0);
      expect(investing.outflow.total).toBe(300_000);

      const financing = report.sections.find((s) => s.section === 'financing')!;
      expect(financing.inflow.total).toBe(1_000_000);
    });
  });

  describe('итог группы считается по КОРНЯМ, а не по всем строкам', () => {
    it('вложенная статья не учитывается дважды', () => {
      // Свёртка уже подняла сумму ребёнка в родителя. Сложив всех подряд,
      // получили бы миллион вместо пятисот тысяч — и это выглядело бы
      // правдоподобно, пока не сверишь с выпиской.
      const report = buildCashFlowArticlesReport({
        articles,
        amounts,
        openingBalance: 0,
        closingBalance: 1_020_000,
      });
      const operating = report.sections.find((s) => s.section === 'operating')!;

      expect(operating.inflow.total).toBe(500_000);
      expect(operating.inflow.rows).toHaveLength(1);
      expect(operating.inflow.rows[0].children[0].name).toBe('Выручка');
    });
  });

  describe('РАВЕНСТВО «начало + поток = конец»', () => {
    it('набор 1: обычный месяц', () => {
      const report = buildCashFlowArticlesReport({
        articles,
        amounts,
        openingBalance: 200_000,
        closingBalance: 1_220_000,
      });

      expect(report.netCashFlow).toBe(1_020_000);
      expect(report.openingBalance + report.netCashFlow).toBe(
        report.closingBalance,
      );
      expect(report.isBalanced).toBe(true);
    });

    it('набор 2: с переводами между своими счетами', () => {
      // Перевод со своего счёта на свой денег бизнесу не прибавляет: он не
      // входит в потоки и показан отдельным блоком с нулевым итогом.
      const report = buildCashFlowArticlesReport({
        articles,
        amounts,
        openingBalance: 50_000,
        closingBalance: 1_070_000,
        transfers: { incoming: 700_000, outgoing: 700_000 },
      });

      expect(report.transfers.total).toBe(0);
      expect(report.openingBalance + report.netCashFlow).toBe(
        report.closingBalance,
      );
      expect(report.isBalanced).toBe(true);
    });

    it('набор 3: остаток ушёл в минус', () => {
      const report = buildCashFlowArticlesReport({
        articles: [article(3, 'Расходы', 'expense', 'operating')],
        amounts: [{ id: 3, amount: 130_000 }],
        openingBalance: 100_000,
        closingBalance: -30_000,
      });

      expect(report.netCashFlow).toBe(-130_000);
      expect(report.openingBalance + report.netCashFlow).toBe(
        report.closingBalance,
      );
      expect(report.isBalanced).toBe(true);
    });

    it('равенство держится и на копейках', () => {
      const report = buildCashFlowArticlesReport({
        articles: [article(1, 'Доходы', 'income', 'operating')],
        amounts: [{ id: 1, amount: 0.1 }],
        openingBalance: 0.1,
        closingBalance: 0.2,
      });

      expect(report.isBalanced).toBe(true);
    });
  });

  describe('деньги, прошедшие МИМО статей', () => {
    it('видны отдельной строкой, а не растворяются', () => {
      // Счёт без статьи не попадает в разбивку, но из остатка не исчезает.
      // Молча оставить разницу значит заставить человека складывать строки
      // и не сходиться — а причину он не найдёт.
      const report = buildCashFlowArticlesReport({
        articles: [article(1, 'Доходы', 'income', 'operating')],
        amounts: [{ id: 1, amount: 400_000 }],
        openingBalance: 0,
        closingBalance: 500_000,
      });

      expect(report.unclassified).toBe(100_000);
      expect(report.isBalanced).toBe(true);
    });

    it('когда всё разнесено, строка нулевая', () => {
      const report = buildCashFlowArticlesReport({
        articles: [article(1, 'Доходы', 'income', 'operating')],
        amounts: [{ id: 1, amount: 500_000 }],
        openingBalance: 0,
        closingBalance: 500_000,
      });

      expect(report.unclassified).toBe(0);
    });
  });

  describe('переводы между своими счетами', () => {
    it('в потоки не входят', () => {
      const report = buildCashFlowArticlesReport({
        articles: [],
        amounts: [],
        openingBalance: 0,
        closingBalance: 0,
        transfers: { incoming: 900_000, outgoing: 900_000 },
      });

      expect(report.sections.every((s) => s.total === 0)).toBe(true);
      expect(report.netCashFlow).toBe(0);
    });

    it('перекос в блоке переводов ВИДЕН, а не спрятан', () => {
      // Ненулевой итог переводов — поломка данных. Спрятав её, мы оставили
      // бы человека с отчётом, который «почти сходится».
      const report = buildCashFlowArticlesReport({
        articles: [],
        amounts: [],
        openingBalance: 0,
        closingBalance: 0,
        transfers: { incoming: 900_000, outgoing: 800_000 },
      });

      expect(report.transfers.total).toBe(100_000);
    });
  });

  describe('вырожденные случаи', () => {
    it('пустой период не роняет расчёт', () => {
      const report = buildCashFlowArticlesReport({
        articles: [],
        amounts: [],
        openingBalance: 0,
        closingBalance: 0,
      });

      expect(report.sections).toHaveLength(3);
      expect(report.netCashFlow).toBe(0);
      expect(report.isBalanced).toBe(true);
    });

    it('статья без раздела попадает в операционный, а не пропадает', () => {
      // Доходы и расходы могли завестись до правила «раздел обязателен».
      // Спрятать такую статью значит потерять настоящие деньги из виду.
      const report = buildCashFlowArticlesReport({
        articles: [article(1, 'Прочее', 'income', null)],
        amounts: [{ id: 1, amount: 1_000 }],
        openingBalance: 0,
        closingBalance: 1_000,
      });
      const operating = report.sections.find((s) => s.section === 'operating')!;

      expect(operating.inflow.total).toBe(1_000);
      expect(report.unclassified).toBe(0);
    });

    it('три раздела присутствуют всегда, даже пустые', () => {
      // Пропавший раздел читается как «такого не бывает», а не «пусто».
      const report = buildCashFlowArticlesReport({
        articles: [],
        amounts: [],
        openingBalance: 0,
        closingBalance: 0,
      });

      expect(report.sections.map((s) => s.section)).toEqual([
        'operating',
        'investing',
        'financing',
      ]);
    });
  });
});
