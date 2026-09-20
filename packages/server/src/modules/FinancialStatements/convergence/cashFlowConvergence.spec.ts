// © 2026 Bigfin
import { buildCashFlowArticlesReport } from '../modules/CashFlowArticles/buildCashFlowArticlesReport';
import {
  CONVERGENCE_FIXTURES,
  CONVERGENCE_TOLERANCE,
  ConvergenceFixture,
} from './fixtures';

/**
 * Инварианты 1 и 9 раздела 11.10 ТЗ-2, на всех трёх наборах.
 *
 * 1. `Остаток на начало + Чистый поток = Остаток на конец`.
 * 9. Итог блока «Переводы между своими счетами» = 0.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ НАБОР ПРОВЕРОК. Отчёт о деньгах человек сверяет с
 * банковской выпиской. Не сошлось — он перестаёт верить продукту целиком,
 * включая те отчёты, которые верны. Поэтому проверка идёт не на одном
 * удобном примере, а на трёх, включая тот, где часть денег прошла мимо
 * статей.
 */
const report = (fixture: ConvergenceFixture) =>
  buildCashFlowArticlesReport({
    articles: fixture.articles,
    amounts: fixture.amounts,
    openingBalance: fixture.openingBalance,
    closingBalance: fixture.closingBalance,
    transfers: fixture.transfers,
  });

describe('сходимость отчёта о движении денег', () => {
  describe.each(CONVERGENCE_FIXTURES.map((f) => [f.key, f] as const))(
    'набор %s',
    (_key: string, fixture: ConvergenceFixture) => {
      it(`(${fixture.title}) начало + поток = конец`, () => {
        // Инвариант 1. Расхождение больше половины копейки — падение, а не
        // предупреждение: в деньгах предупреждений не бывает.
        const result = report(fixture);
        const difference = Math.abs(
          result.openingBalance + result.netCashFlow - result.closingBalance,
        );

        expect(difference).toBeLessThanOrEqual(CONVERGENCE_TOLERANCE);
        expect(result.isBalanced).toBe(true);
      });

      it('разделы плюс «не разнесено» дают ЧИСТЫЙ ПОТОК', () => {
        // Это и есть настоящее содержание инварианта 1: равенство
        // «начало + поток = конец» держится конструкцией, а вот СТАТЕЙНАЯ
        // сторона сойтись с денежной обязана сама.
        const result = report(fixture);
        const classified = result.sections.reduce(
          (sum, section) => sum + section.total,
          0,
        );
        const difference = Math.abs(
          classified + result.unclassified - result.netCashFlow,
        );

        expect(difference).toBeLessThanOrEqual(CONVERGENCE_TOLERANCE);
      });

      it('итог переводов между своими счетами РОВНО НОЛЬ', () => {
        // Инвариант 9. Сравнение точное, а не с допуском: перевод со своего
        // счёта на свой не меняет денег у бизнеса ни на копейку.
        expect(report(fixture).transfers.total).toBe(0);
      });

      it('раздел равен притоку минус отток', () => {
        report(fixture).sections.forEach((section) => {
          const difference = Math.abs(
            section.inflow.total - section.outflow.total - section.total,
          );

          expect(difference).toBeLessThanOrEqual(CONVERGENCE_TOLERANCE);
        });
      });
    },
  );

  it('набор В ПОКАЗЫВАЕТ деньги, прошедшие мимо статей', () => {
    // Иначе проверка выше проходила бы на нулях и ничего не значила: набор
    // специально собран так, чтобы статейная сторона была неполной.
    const fixture = CONVERGENCE_FIXTURES.find((f) => f.key === 'В')!;

    expect(report(fixture).unclassified).toBe(12_500.25);
  });

  it('проверка ловит подделку', () => {
    // Мутация: сломанный остаток на конец обязан ронять сходимость.
    const fixture = CONVERGENCE_FIXTURES[0];
    const broken = buildCashFlowArticlesReport({
      articles: fixture.articles,
      amounts: fixture.amounts,
      openingBalance: fixture.openingBalance,
      closingBalance: fixture.closingBalance + 1,
      transfers: fixture.transfers,
    });
    const classified = broken.sections.reduce(
      (sum, section) => sum + section.total,
      0,
    );

    expect(Math.abs(classified - broken.netCashFlow)).toBeGreaterThan(
      CONVERGENCE_TOLERANCE,
    );
  });
});
